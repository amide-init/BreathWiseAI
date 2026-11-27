"""Thread-safe bounded in-memory LRU+TTL cache for warm Cloud Functions Gen 2 instances.

Provides sub-millisecond L1 caching in front of Firestore/external APIs without
introducing external dependencies. Every cache instance is strictly size-bounded
and TTL-expired, with explicit key/prefix invalidation on writes.
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict


class TTLCache[TVal]:
    """Bounded thread-safe LRU cache with per-entry TTL expiration."""

    def __init__(self, *, max_size: int = 128, ttl_seconds: float = 60.0) -> None:
        if max_size < 1:
            raise ValueError("max_size must be >= 1")
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be > 0")
        self._max_size = max_size
        self._ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._entries: OrderedDict[str, tuple[float, TVal]] = OrderedDict()

    def get(self, key: str) -> TVal | None:
        now = time.monotonic()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if now >= expires_at:
                self._entries.pop(key, None)
                return None
            self._entries.move_to_end(key)
            return value

    def set(self, key: str, value: TVal, *, ttl_seconds: float | None = None) -> None:
        ttl = self._ttl_seconds if ttl_seconds is None else ttl_seconds
        if ttl <= 0:
            return
        expires_at = time.monotonic() + ttl
        with self._lock:
            self._entries[key] = (expires_at, value)
            self._entries.move_to_end(key)
            while len(self._entries) > self._max_size:
                self._entries.popitem(last=False)

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._entries.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> int:
        removed = 0
        with self._lock:
            keys_to_drop = [k for k in self._entries if k.startswith(prefix)]
            for key in keys_to_drop:
                self._entries.pop(key, None)
                removed += 1
        return removed

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._entries)


# Shared process-local L1 caches for warm Cloud Run instances.
# - `knowledge_base/` changes only on manual seed/deploy -> 30 min TTL.
# - `air_quality_cache` is shared across users for a city -> 5 min L1 in front of 30 min Firestore L2.
# - `families/{uid}` & `impact_logs/{uid}` -> short 60s L1 TTL, invalidated immediately on writes.
# - Repeat identical indoor assessments -> 30 min L1 TTL keyed by uid + city + AQI bucket + family + answers.
KNOWLEDGE_L1_CACHE: TTLCache[list[object]] = TTLCache(max_size=4, ttl_seconds=1800.0)
AQI_L1_CACHE: TTLCache[object] = TTLCache(max_size=128, ttl_seconds=300.0)
FAMILY_L1_CACHE: TTLCache[object] = TTLCache(max_size=256, ttl_seconds=60.0)
IMPACT_L1_CACHE: TTLCache[dict[str, object]] = TTLCache(max_size=256, ttl_seconds=60.0)
INDOOR_L1_CACHE: TTLCache[dict[str, object]] = TTLCache(max_size=128, ttl_seconds=1800.0)


def clear_all_l1_caches() -> None:
    """Clear all process-local L1 caches (used in test isolation)."""
    KNOWLEDGE_L1_CACHE.clear()
    AQI_L1_CACHE.clear()
    FAMILY_L1_CACHE.clear()
    IMPACT_L1_CACHE.clear()
    INDOOR_L1_CACHE.clear()
