import time
from typing import Dict, Tuple


class SlidingWindowRateLimiter:
    """Naive in-memory sliding window limiter keyed by (key, window_seconds).

    Good enough for a single-process backend. For multi-instance deployments,
    replace with Redis or a DB-backed counter.
    """

    def __init__(self) -> None:
        self._events: Dict[Tuple[str, int], list[float]] = {}

    def allow(self, key: str, max_events: int, window_seconds: int) -> bool:
        now = time.time()
        k = (key, window_seconds)
        arr = self._events.get(k, [])
        # drop old
        cutoff = now - window_seconds
        arr = [ts for ts in arr if ts >= cutoff]
        if len(arr) >= max_events:
            self._events[k] = arr
            return False
        arr.append(now)
        self._events[k] = arr
        return True


