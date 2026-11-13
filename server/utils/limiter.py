import os
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

redis_url = os.environ.get("REDIS_URL")
storage_uri = redis_url if redis_url else "memory://"

try:
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["300 per minute", "2000 per hour"],
        storage_uri=storage_uri
    )
except Exception as e:
    logger.warning("Failed to initialize limiter with %s: %s. Falling back to memory://", storage_uri, e)
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["300 per minute", "2000 per hour"],
        storage_uri="memory://"
    )
