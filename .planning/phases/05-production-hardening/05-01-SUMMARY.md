---
phase: 05-production-hardening
plan: 01
status: completed
completed_at: 2026-11-13T11:12:00+05:30
files_modified:
  - server/services/ai_engine.py
  - server/routes/analyze.py
  - server/utils/limiter.py
  - server/app.py
  - server/routes/auth.py
  - server/tests/test_performance.py
---

# Plan 05-01 Execution Summary: ML Concurrency, Threadpool Offloading & Redis Caching

## 1. Overview
Hardened the ResuMatch API backend for high-concurrency production deployments by offloading heavy Sentence-Transformers CPU/GPU inference and document structure parsing from the ASGI asyncio event loop using Starlette's `run_in_threadpool`, implementing a distributed Redis embedding cache with automatic in-memory LRU fallback, and replacing dead Flask limiter code with `slowapi` FastAPI rate limiting on analysis and authentication endpoints.

## 2. Changes Made
- **`server/routes/analyze.py`**:
  - Imported `run_in_threadpool` from `starlette.concurrency` and `limiter` from `utils.limiter`.
  - Converted `analyze_endpoint` (`POST /api/analyze`) to `async def` and offloaded `hybrid_match_score` and `parse_resume_structure` to worker threads, preventing event loop starvation.
  - Converted file parsing (`parse_pdf`, `parse_docx`) and document uploads (`upload_file`) in `parse_pdf_endpoint` and `upload_resume_file` to asynchronous threadpool execution.
  - Applied `@limiter.limit("20/minute")` to `POST /api/analyze`.
- **`server/services/ai_engine.py`**:
  - Implemented `RedisEmbeddingCache` supporting Redis connections via `REDIS_URL`, SHA-256 sentence hashing, 24-hour expiration, and binary `float32` vector serialization.
  - Added resilient fallback: if Redis is unset, offline, or times out, it seamlessly falls back to `BoundedEmbeddingCache` with zero client-facing errors.
  - Integrated `RedisEmbeddingCache` into `get_cached_embedding`.
- **`server/utils/limiter.py` & `server/app.py`**:
  - Replaced dead `flask_limiter` code with `slowapi.Limiter(storage_uri=os.environ.get("REDIS_URL", "memory://"))`.
  - Attached `app.state.limiter = limiter`, registered `RateLimitExceeded` exception handler, and added `SlowAPIMiddleware` in `server/app.py`.
- **`server/routes/auth.py`**:
  - Applied `@limiter.limit("10/minute")` to `POST /api/auth/register` and `POST /api/auth/login`.
- **`server/tests/test_performance.py`**:
  - Created unit tests verifying `BoundedEmbeddingCache` eviction, `RedisEmbeddingCache` fallback and binary serialization, `slowapi` limiter configuration, and `run_in_threadpool` offloading.

## 3. Verification
- `python -m py_compile` passed across all modified server modules.
- Fast in-memory unit tests verified LRU eviction, float32 serialization, Redis fallback, limiter setup, and async threadpool offloading.
