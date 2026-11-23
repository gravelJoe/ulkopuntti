import { useCallback, useEffect, useState } from 'react';
import { alarmTune, ringWhenSilent } from '../program/store.js';
import { playTune, stopTune, unlockAudio } from '../utils/alert.js';

const AUTO_CLOSE_MS = 4000; // how long "Go!" stays up after an audible tune ends

// The countdown is based on an end timestamp, not on counting ticks, so
// it stays correct even if the phone throttles or pauses the page.
//
// When the rest ends, the chosen tune plays once. "Go!" closes 4 s after the
// tune ends, if the tune was heard and the page is visible; otherwise it stays
// until a tap. Clearing or replacing the timer (Skip, Stop alarm, a new rest,
// finishing) or unmounting stops the tune. Hiding the page does not: whether the
// browser plays sound in a hidden page is up to the browser.
export function useRestTimer() {
  // { endAt, durationMs, info, finished, endedAgoMs, tuneEnded } | null
  const [timer, setTimer] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [playing, setPlaying] = useState(false);

  // Tick while running; detect the end.
  useEffect(() => {
    if (!timer || timer.finished) return;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (n >= timer.endAt) {
        // Returns the state unchanged if already finished, so the interval and
        // visibilitychange can't finish it twice. endedAgoMs: how late the end was noticed.
        setTimer((t) => (t && !t.finished ? { ...t, finished: true, endedAgoMs: n - t.endAt } : t));
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

  // The alarm: once per finished rest. Keyed on endAt too, so marking tuneEnded
  // doesn't play it again, and a new rest (new endAt) stops the old tune.
  const finished = Boolean(timer?.finished);
  const endAt = timer?.endAt;
  useEffect(() => {
    if (!finished) return;
    setPlaying(true);
    // Settings are read now, so a change saved on this phone applies to the next alarm.
    playTune(alarmTune(), {
      ringWhenSilent: ringWhenSilent(),
      onEnded: ({ audible }) => {
        setPlaying(false);
        // Only an audible tune starts the auto-close; a blocked one stays until a tap.
        // Only the rest this tune belongs to (same endAt) is marked.
        if (audible) setTimer((t) => (t && t.endAt === endAt ? { ...t, tuneEnded: true } : t));
      },
    });
    return () => {
      stopTune();
      setPlaying(false);
    };
  }, [finished, endAt]);

  // Close a little while after the tune ended — unless the page is hidden, so
  // "Go!" is still there when you come back.
  useEffect(() => {
    if (!timer?.tuneEnded || document.hidden) return;
    const id = setTimeout(() => setTimer(null), AUTO_CLOSE_MS);
    return () => clearTimeout(id);
  }, [timer?.tuneEnded]);

  /** Call from a tap handler (so sound gets unlocked). */
  const start = useCallback((seconds, info) => {
    unlockAudio();
    const n = Date.now();
    setNow(n);
    setTimer({ endAt: n + seconds * 1000, durationMs: seconds * 1000, info, finished: false, endedAgoMs: 0, tuneEnded: false });
  }, []);

  /** Shorten the remaining rest. */
  const fastForward = useCallback((seconds) => {
    setTimer((t) => (t && !t.finished ? { ...t, endAt: Math.max(Date.now(), t.endAt - seconds * 1000) } : t));
  }, []);

  /** Add time to the running rest (the progress bar stretches to match). */
  const extend = useCallback((seconds) => {
    setTimer((t) => {
      if (!t || t.finished) return t;
      const endAt = t.endAt + seconds * 1000;
      const durationMs = Math.max(t.durationMs, endAt - Date.now());
      return { ...t, endAt, durationMs };
    });
  }, []);

  /** End/close immediately, without the alert (stops a tune that is playing). */
  const skip = useCallback(() => setTimer(null), []);

  return {
    timer,
    remainingMs: timer ? Math.max(0, timer.endAt - now) : 0,
    endedAgoMs: timer?.endedAgoMs ?? 0,
    playing,
    start,
    fastForward,
    extend,
    skip,
  };
}
