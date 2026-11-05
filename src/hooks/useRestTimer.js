import { useCallback, useEffect, useState } from 'react';
import { playRestOverAlert, unlockAudio } from '../utils/alert.js';

const AUTO_CLOSE_MS = 4000; // how long "Go!" stays up after the rest ends

// The countdown is based on an end timestamp, not on counting ticks, so
// it stays correct even if the phone throttles or pauses the page.
export function useRestTimer() {
  // { endAt, durationMs, info, finished } | null
  const [timer, setTimer] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // Tick while running; detect the end.
  useEffect(() => {
    if (!timer || timer.finished) return;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (n >= timer.endAt) {
        setTimer((t) => t && { ...t, finished: true });
        playRestOverAlert();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [timer]);

  // Close a little while after it has finished.
  useEffect(() => {
    if (!timer?.finished) return;
    const id = setTimeout(() => setTimer(null), AUTO_CLOSE_MS);
    return () => clearTimeout(id);
  }, [timer?.finished]);

  /** Call from a tap handler (so sound gets unlocked). */
  const start = useCallback((seconds, info) => {
    unlockAudio();
    const n = Date.now();
    setNow(n);
    setTimer({ endAt: n + seconds * 1000, durationMs: seconds * 1000, info, finished: false });
  }, []);

  /** Shorten the remaining rest. */
  const fastForward = useCallback((seconds) => {
    setTimer((t) => t && !t.finished ? { ...t, endAt: Math.max(Date.now(), t.endAt - seconds * 1000) } : t);
  }, []);

  /** End/close immediately, without the alert. */
  const skip = useCallback(() => setTimer(null), []);

  return {
    timer,
    remainingMs: timer ? Math.max(0, timer.endAt - now) : 0,
    start,
    fastForward,
    skip,
  };
}
