// The rest alarm: plays a tune (src/utils/tunes.js) with Web Audio, plus vibration.
//
// Browsers only allow sound after a user tap, so call unlockAudio() from a tap
// handler (marking a set done) before the timer runs out.
//
// iPhone silent mode: web audio is "ambient" by default and follows the silent
// switch. With ringWhenSilent, playTune switches navigator.audioSession to
// 'playback' just before the sound and back to 'auto' when it stops or ends.
// That plays in silent mode but pauses other apps' music, which doesn't resume
// by itself. iPhones don't support vibration in the browser.
//
// Blocked sound: if the AudioContext isn't running after up to 1 s of resume(),
// nothing plays and onEnded({ audible: false }) is called at once, so the
// caller can show a visual-only alarm.
//
// Only one tune plays at a time. Every browser call is wrapped, so a missing
// API can't break the workout screen.

import { TUNES, tuneIdOrDefault } from './tunes.js';

const RESUME_TIMEOUT_MS = 1000;
const LEAD_S = 0.05; // schedule slightly ahead of "now"
const ATTACK_S = 0.02;
const RELEASE_S = 0.03;
const PEAK = 0.7;
const SHORT_VIBRATION = [300, 150, 300, 150, 300];
// Long tunes: one pattern of 68 entries (30.6 s), under Chrome's believed 99-entry limit.
const LONG_VIBRATION = Array.from({ length: 34 }, () => [600, 300]).flat();

let ctx = null;
let current = null; // { master, oscillators, timeoutId, onEnded } while a tune plays
let playGen = 0; // bumped by every stop or new play, so a play still starting gives up
let sessionSwitched = false; // true while this module has the session on 'playback'

const isAsleep = (c) => c.state === 'suspended' || c.state === 'interrupted';

function attempt(fn) {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (isAsleep(ctx)) ctx.resume();
    // Play a silent buffer inside the gesture — needed on older iOS.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* no audio available */
  }
}

function restoreSession() {
  if (!sessionSwitched) return;
  sessionSwitched = false;
  attempt(() => {
    navigator.audioSession.type = 'auto';
  });
}

/** Silences and releases the playing tune, if any. Does not touch the session or call onEnded. */
function release() {
  if (!current) return;
  const { master, oscillators, timeoutId } = current;
  current = null;
  clearTimeout(timeoutId);
  attempt(() => {
    const now = ctx.currentTime;
    // Anchor the ramp at the current value, or some engines jump to 0 with a click.
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + RELEASE_S);
  });
  for (const osc of oscillators) attempt(() => osc.stop(ctx.currentTime + RELEASE_S));
  setTimeout(() => {
    for (const osc of oscillators) attempt(() => osc.disconnect());
    attempt(() => master.disconnect());
  }, 40);
  attempt(() => navigator.vibrate?.(0));
}

/** Stops whatever is playing (or still starting). Does not call onEnded. */
export function stopTune({ keepSession = false } = {}) {
  playGen++;
  release();
  if (!keepSession) restoreSession();
}

/** A gain envelope: 20 ms linear attack to 0.7, hold, 30 ms linear release ending at `end`. */
function envelope(gain, start, end) {
  gain.setValueAtTime(0, start);
  gain.linearRampToValueAtTime(PEAK, start + ATTACK_S);
  gain.setValueAtTime(PEAK, Math.max(start + ATTACK_S, end - RELEASE_S));
  gain.linearRampToValueAtTime(0, end);
}

function scheduleNotes(tune, master, t0) {
  const oscillators = [];
  for (const note of tune.notes) {
    if (note.hz === null) continue;
    attempt(() => {
      const start = t0 + note.startS;
      const end = start + note.durS;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tune.wave;
      osc.frequency.value = note.hz;
      envelope(gain.gain, start, end);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(end);
      oscillators.push(osc);
    });
  }
  return oscillators;
}

function scheduleSweep(tune, master, t0) {
  const oscillators = [];
  attempt(() => {
    const { lowHz, highHz, riseS, fallS } = tune.sweep;
    const end = t0 + tune.lengthS;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tune.wave;
    osc.frequency.setValueAtTime(lowHz, t0);
    // Alternate rising and falling ramps; the last one is cut off at lengthS.
    let t = t0;
    let rising = true;
    while (t < end) {
      const span = rising ? riseS : fallS;
      const from = rising ? lowHz : highHz;
      const to = rising ? highHz : lowHz;
      const stop = Math.min(t + span, end);
      osc.frequency.linearRampToValueAtTime(from + ((to - from) * (stop - t)) / span, stop);
      t = stop;
      rising = !rising;
    }
    envelope(gain.gain, t0, end);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(end);
    oscillators.push(osc);
  });
  return oscillators;
}

/**
 * Plays a tune (an unknown id plays 'beep'). Any tune already playing is stopped.
 * onEnded({ audible }) is called once when the tune ends (audible: true), or at
 * once if the sound is blocked (audible: false). It is not called if the tune is
 * stopped with stopTune() or replaced by another playTune().
 */
export async function playTune(id, { ringWhenSilent = false, onEnded } = {}) {
  stopTune({ keepSession: true });
  const gen = ++playGen;
  const tune = TUNES[tuneIdOrDefault(id)];

  if (ringWhenSilent && 'audioSession' in navigator) {
    attempt(() => {
      navigator.audioSession.type = 'playback';
      sessionSwitched = true;
    });
  }

  attempt(() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx ??= new AC();
  });
  if (ctx && isAsleep(ctx)) {
    await Promise.race([
      attempt(() => ctx.resume())?.catch?.(() => {}),
      new Promise((resolve) => setTimeout(resolve, RESUME_TIMEOUT_MS)),
    ]);
  }

  // stopTune() or a newer playTune() ran during the wait; it owns the session now.
  if (gen !== playGen) return;

  if (!ctx || ctx.state !== 'running') {
    restoreSession();
    onEnded?.({ audible: false });
    return;
  }

  let master = null;
  let oscillators = [];
  attempt(() => {
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    const t0 = ctx.currentTime + LEAD_S;
    oscillators = tune.sweep ? scheduleSweep(tune, master, t0) : scheduleNotes(tune, master, t0);
  });

  attempt(() => navigator.vibrate?.(tune.lengthS < 2 ? SHORT_VIBRATION : LONG_VIBRATION));

  // The end timer and the handle are set even if the audio calls above failed.
  const timeoutId = setTimeout(
    () => {
      if (gen !== playGen) return;
      const ended = current?.onEnded;
      release();
      restoreSession();
      ended?.({ audible: true });
    },
    (tune.lengthS + LEAD_S) * 1000 + 100,
  );
  current = { master, oscillators, timeoutId, onEnded };
}
