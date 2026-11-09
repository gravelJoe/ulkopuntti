import { REST_SECONDS } from '../config/workouts.js';

// Device-local UI preferences (not workout data — stays in localStorage
// even after the backend arrives).

const THEME_KEY = 'puntti.theme';

/** 'system' | 'light' | 'dark' */
export function getThemePreference() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function setThemePreference(value) {
  try {
    if (value === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, value);
  } catch {
    /* storage unavailable — ignore */
  }
}

// ── Rest timer length ───────────────────────────────────────


const REST_KEY = 'puntti.restSeconds';
export const REST_MIN_SECONDS = 30;
export const REST_MAX_SECONDS = 600;
export const REST_STEP_SECONDS = 15;

/** Rest length in seconds (defaults to REST_SECONDS from the config). */
export function getRestSeconds() {
  try {
    const v = Number(localStorage.getItem(REST_KEY));
    if (Number.isFinite(v) && v >= REST_MIN_SECONDS && v <= REST_MAX_SECONDS) return v;
  } catch {
    /* ignore */
  }
  return REST_SECONDS;
}

export function setRestSeconds(seconds) {
  try {
    if (seconds === REST_SECONDS) localStorage.removeItem(REST_KEY);
    else localStorage.setItem(REST_KEY, String(seconds));
  } catch {
    /* ignore */
  }
}
