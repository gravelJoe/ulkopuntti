// Dev-only simulated time. In `npm run dev` an offset (ms) saved on this device
// shifts Luxon's "now" (DateTime.now()), so weekly progression, today's workout
// and the "done today" marker can be tested in other days and weeks. The rest
// timer and ids use Date.now() and keep real time. In production nothing here
// changes anything. Only main.jsx and the dev panel import this file.
import { Settings } from 'luxon';

const KEY = 'puntti.dev.timeOffset';
const DEV = Boolean(import.meta.env?.DEV);

function read() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

let offset = DEV ? read() : 0;
if (DEV && offset) Settings.now = () => Date.now() + offset;

export const offsetMs = () => offset;

/** Dev only: set the offset and reload so every screen recomputes. */
export function setOffset(ms) {
  if (!DEV) return;
  try {
    if (ms) localStorage.setItem(KEY, String(ms));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.location.reload();
}
