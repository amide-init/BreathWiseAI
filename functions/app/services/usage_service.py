"""Per-user daily & per-minute rate limiting + Settings Usage Summary service."""

from __future__ import annotations

import os
import threading
import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta

from app.repositories.usage_repo import UsageRepository
from app.schemas.usage import UsageBucketKey, UsageCategoryItem, UserUsageSummary
from app.utils.datetime_utils import to_iso_utc, utc_now
from app.utils.errors import RateLimitError
from app.utils.ttl_cache import TTLCache

# Metadata + configurable daily limits per user (overridable via env vars)
_BUCKET_META: tuple[tuple[UsageBucketKey, str, str, str, int], ...] = (
    (
        "chatMessages",
        "AI Chat Messages",
        "Conversational Q&A turns in Ask BreathWiseAI",
        "RATE_LIMIT_CHAT_DAILY",
        30,
    ),
    (
        "dailyPlans",
        "AI Daily Plans",
        "Personalized morning, afternoon & evening clean-air plans",
        "RATE_LIMIT_DAILY_PLAN_DAILY",
        10,
    ),
    (
        "indoorAssessments",
        "Indoor Air Assessments",
        "Questionnaire-based indoor air risk & harm-reduction checks",
        "RATE_LIMIT_INDOOR_DAILY",
        10,
    ),
    (
        "profileParses",
        "AI Profile Auto-Fills",
        "Server-side natural-language family & home parsing",
        "RATE_LIMIT_PROFILE_PARSE_DAILY",
        15,
    ),
    (
        "impactLogs",
        "Impact Action Logs",
        "CO₂ avoided & exposure-protection actions logged",
        "RATE_LIMIT_IMPACT_LOG_DAILY",
        40,
    ),
)

_AI_BURST_BUCKETS: frozenset[str] = frozenset(
    {"chatMessages", "dailyPlans", "indoorAssessments", "profileParses"}
)

# Process-local sliding 60s burst guard + short 15s L1 cache for Settings usage reads
_BURST_LOCK = threading.Lock()
_BURST_TIMESTAMPS: dict[str, deque[float]] = defaultdict(deque)
_USAGE_L1_CACHE: TTLCache[UserUsageSummary] = TTLCache(max_size=256, ttl_seconds=15.0)


def _get_daily_limit(env_var: str, default_val: int) -> int:
    raw = os.getenv(env_var)
    if raw is None:
        return default_val
    try:
        return max(1, int(raw))
    except ValueError:
        return default_val


def _get_burst_limit_per_minute() -> int:
    return _get_daily_limit("RATE_LIMIT_AI_BURST_PER_MIN", 8)


def _utc_day_bounds(reference_now: datetime) -> tuple[str, str]:
    utc_dt = reference_now.astimezone(UTC)
    date_str = utc_dt.strftime("%Y-%m-%d")
    next_midnight = (utc_dt + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return date_str, to_iso_utc(next_midnight)


def clear_usage_runtime_caches() -> None:
    """Reset in-memory burst windows & usage L1 cache (used in unit tests)."""
    with _BURST_LOCK:
        _BURST_TIMESTAMPS.clear()
    _USAGE_L1_CACHE.clear()


class UsageService:
    """Enforces per-user burst + daily quotas and produces Settings Usage summaries."""

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
                return label, _get_daily_limit(env_var, default_limit)
        return bucket, 30

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

    def consume(
        self,
        *,
        user_id: str,
        bucket: str,
        now: datetime | None = None,
    ) -> int:
        """Enforce per-minute burst + daily per-user quota and increment usage count."""
        self._check_burst(user_id=user_id, bucket=bucket)

        reference_now = now or utc_now()
        date_str, _resets_at = _utc_day_bounds(reference_now)
        label, limit = self._bucket_config(bucket)

        new_count, allowed = self._repo.check_and_increment(
            user_id=user_id,
            bucket=bucket,
            limit=limit,
            date_str=date_str,
        )
        _USAGE_L1_CACHE.invalidate(f"{user_id}:{date_str}")

        if not allowed:
            raise RateLimitError(
                f"Daily limit reached for {label} ({limit}/{limit}). "
                "Your quota resets at midnight UTC — check Settings > Usage for details."
            )
        return new_count

    def get_usage_summary(
        self,
        *,
        user_id: str,
        now: datetime | None = None,
    ) -> UserUsageSummary:
        """Return today's per-feature usage breakdown and remaining quota for `user_id`."""
        reference_now = now or utc_now()
        date_str, resets_at = _utc_day_bounds(reference_now)
        cache_key = f"{user_id}:{date_str}"

        if self._use_l1_cache:
            cached = _USAGE_L1_CACHE.get(cache_key)
            if cached is not None:
                return cached

        counts = self._repo.get_daily_counts(user_id=user_id, date_str=date_str)
        categories: list[UsageCategoryItem] = []
        total_used = 0
        total_limit = 0

        for key, label, description, env_var, default_limit in _BUCKET_META:
            limit = _get_daily_limit(env_var, default_limit)
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
            date=date_str,
            resets_at=resets_at,
            burst_limit_per_minute=_get_burst_limit_per_minute(),
            total_used=total_used,
            total_limit=total_limit,
            categories=categories,
        )
        if self._use_l1_cache:
            _USAGE_L1_CACHE.set(cache_key, summary)
        return summary
