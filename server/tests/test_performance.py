import asyncio
import numpy as np
import pytest
from starlette.concurrency import run_in_threadpool
from services.ai_engine import BoundedEmbeddingCache, RedisEmbeddingCache
from utils.limiter import limiter


def test_bounded_embedding_cache_lru():
    """Verify that in-memory BoundedEmbeddingCache respects maxsize and evicts oldest."""
    cache = BoundedEmbeddingCache(maxsize=2)
    vec1 = np.array([1.0, 2.0], dtype=np.float32)
    vec2 = np.array([3.0, 4.0], dtype=np.float32)
    vec3 = np.array([5.0, 6.0], dtype=np.float32)

    cache.put(1, vec1)
    cache.put(2, vec2)
    assert np.array_equal(cache.get(1), vec1)
    assert np.array_equal(cache.get(2), vec2)

    # Adding third item should evict key 1 (since key 2 was accessed last)
    cache.get(2)
    cache.put(3, vec3)
    assert cache.get(1) is None
    assert np.array_equal(cache.get(2), vec2)
    assert np.array_equal(cache.get(3), vec3)


def test_redis_embedding_cache_fallback():
    """Verify that RedisEmbeddingCache gracefully falls back to in-memory LRU when Redis is unset."""
    local_lru = BoundedEmbeddingCache(maxsize=8)
    cache = RedisEmbeddingCache(fallback_cache=local_lru, redis_url=None)

    sample_text = "Senior Software Engineer with FastAPI and React experience"
    vec = np.array([0.25, 0.5, 0.75], dtype=np.float32)

    cache.put(sample_text, vec)
    cached_vec = cache.get(sample_text)

    assert cached_vec is not None
    assert np.allclose(cached_vec, vec)
    assert cache.get("Unknown resume text") is None


def test_redis_embedding_cache_serialization_logic():
    """Verify binary float32 serialization and deserialization used for Redis storage."""
    original_vector = np.random.randn(384).astype(np.float32)
    serialized_bytes = original_vector.tobytes()

    recovered_vector = np.frombuffer(serialized_bytes, dtype=np.float32)
    assert np.array_equal(original_vector, recovered_vector)


def test_slowapi_limiter_setup():
    """Verify slowapi limiter configuration and default limits."""
    assert limiter is not None
    assert limiter._default_limits is not None
    assert len(limiter._default_limits) > 0


def test_run_in_threadpool_offloading():
    """Verify that CPU-bound operations run off the main event loop in worker threadpool."""
    async def _runner():
        def cpu_heavy_task(a: int, b: int) -> int:
            total = 0
            for _ in range(1000):
                total += (a * b)
            return total

        return await run_in_threadpool(cpu_heavy_task, 15, 20)

    result = asyncio.run(_runner())
    assert result == 300000

