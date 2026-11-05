import { useEffect } from 'react';

// Keeps the screen on while `enabled` (so the rest-timer beep isn't missed).
// Needs HTTPS. The browser drops the lock when the page is hidden, so it's
// re-requested when the page becomes visible again.
export function useWakeLock(enabled) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock = null;
    let cancelled = false;

    async function request() {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release().catch(() => {});
      } catch {
        /* denied (e.g. battery saver) — ignore */
      }
    }

    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}
