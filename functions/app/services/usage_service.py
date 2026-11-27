"""Per-user lifetime & per-minute burst rate limiting + Settings Usage Summary service."""

from __future__ import annotations

import os
import threading
import time
from collections import defaultdict, deque

from app.repositories.usage_repo import UsageRepository
from app.schemas.usage import UsageBucketKey, UsageCategoryItem, UserUsageSummary
from app.utils.errors import RateLimitError
from app.utils.ttl_cache import TTLCache

# One-time lifetime allowance per account (no daily/monthly auto-reset; overridable via env vars)
_BUCKET_META: tuple[tuple[UsageBucketKey, str, str, str, int], ...] = (
    (
        "chatMessages",
        "AI Chat Messages",
        "Conversational Q&A turns in Ask BreathWiseAI",
        "RATE_LIMIT_CHAT_LIFETIME",
        25,
    ),
    (
        "dailyPlans",
        "AI Daily Plans",
        "Personalized morning, afternoon & evening clean-air plans",
        "RATE_LIMIT_DAILY_PLAN_LIFETIME",
        5,
    ),
    (
        "indoorAssessments",
        "Indoor Air Assessments",
        "Questionnaire-based indoor air risk & harm-reduction checks",
        "RATE_LIMIT_INDOOR_LIFETIME",
        5,
    ),
    (
        "profileParses",
        "AI Profile Auto-Fills",
        "Server-side natural-language family & home parsing",
        "RATE_LIMIT_PROFILE_PARSE_LIFETIME",
        5,
    ),
    (
        "impactLogs",
        "Impact Action Logs",
        "CO₂ avoided & exposure-protection actions logged",
        "RATE_LIMIT_IMPACT_LOG_LIFETIME",
        50,
    ),
)

_AI_BURST_BUCKETS: frozenset[str] = frozenset(
    {"chatMessages", "dailyPlans", "indoorAssessments", "profileParses"}
)

# Process-local sliding 60s burst guard + short 15s L1 cache for Settings usage reads
_BURST_LOCK = threading.Lock()
_BURST_TIMESTAMPS: dict[str, deque[float]] = defaultdict(deque)
_USAGE_L1_CACHE: TTLCache[UserUsageSummary] = TTLCache(max_size=256, ttl_seconds=15.0)


def _get_limit(env_var: str, default_val: int) -> int:
    raw = os.getenv(env_var)
    if raw is None:
        return default_val
    try:
        return max(1, int(raw))
    except ValueError:
        return default_val


def _get_burst_limit_per_minute() -> int:
    return _get_limit("RATE_LIMIT_AI_BURST_PER_MIN", 8)


def clear_usage_runtime_caches() -> None:
    """Reset in-memory burst windows & usage L1 cache (used in unit tests)."""
    with _BURST_LOCK:
        _BURST_TIMESTAMPS.clear()
    _USAGE_L1_CACHE.clear()


class UsageService:
    """Enforces per-user burst + lifetime account quotas and produces Settings Usage summaries."""

    def __init__(
        self,
        *,
        usage_repo: UsageRepository | None = None,
        use_l1_cache: bool | None = None,
    ) -> None:
        self._repo = usage_repo or UsageRepository()
        self._use_l1_cache = (usage_repo is None) if use_l1_cache is None else use_l1_cache

    def _bucket_config(self, bucket: str) -> tuple[str, int]:
        for key, label, _desc, env_var, default_limit in _BUCKET_META:
            if key == bucket:
                return label, _get_limit(env_var, default_limit)
        return bucket, 25

    def _check_burst(self, *, user_id: str, bucket: str) -> None:
        if bucket not in _AI_BURST_BUCKETS:
            return
        burst_limit = _get_burst_limit_per_minute()
        now_mono = time.monotonic()
        cutoff = now_mono - 60.0
        with _BURST_LOCK:
            window = _BURST_TIMESTAMPS[user_id]
            while window and window[0] < cutoff:
                window.popleft()
            if len(window) >= burst_limit:
                raise RateLimitError(
                    f"Too many AI requests in one minute (limit {burst_limit}/min). "
                    "Please wait a few seconds and try again."
                )
            window.append(now_mono)

    def consume(self, *, user_id: str, bucket: str) -> int:
        """Enforce per-minute burst + lifetime per-user quota and increment usage count."""
        self._check_burst(user_id=user_id, bucket=bucket)

        label, limit = self._bucket_config(bucket)
        new_count, allowed = self._repo.check_and_increment(
            user_id=user_id,
            bucket=bucket,
            limit=limit,
        )
        _USAGE_L1_CACHE.invalidate(f"lifetime:{user_id}")

        if not allowed:
            raise RateLimitError(
                f"Account limit reached for {label} ({limit}/{limit} lifetime credits used). "
                "View your usage breakdown in Settings."
            )
        return new_count

    def get_usage_summary(self, *, user_id: str) -> UserUsageSummary:
        """Return lifetime per-feature usage breakdown and remaining quota for `user_id`."""
        cache_key = f"lifetime:{user_id}"

        if self._use_l1_cache:
            cached = _USAGE_L1_CACHE.get(cache_key)
            if cached is not None:
                return cached

        counts = self._repo.get_lifetime_counts(user_id=user_id)
        categories: list[UsageCategoryItem] = []
        total_used = 0
        total_limit = 0

        for key, label, description, env_var, default_limit in _BUCKET_META:
            limit = _get_limit(env_var, default_limit)
            used = min(counts.get(key, 0), limit)
            remaining = max(0, limit - used)
            percent_used = min(100, round((used / limit) * 100)) if limit > 0 else 0
            total_used += used
            total_limit += limit
            categories.append(
                UsageCategoryItem(
                    key=key,
                    label=label,
                    description=description,
                    used=used,
                    limit=limit,
                    remaining=remaining,
                    percent_used=percent_used,
                )
            )

        summary = UserUsageSummary(
            quota_scope="lifetime",
            burst_limit_per_minute=_get_burst_limit_per_minute(),
            total_used=total_used,
            total_limit=total_limit,
            categories=categories,
        )
        if self._use_l1_cache:
            _USAGE_L1_CACHE.set(cache_key, summary)
        return summary
