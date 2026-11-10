// Login state. Logged in → apiAdapter; logged out → guestAdapter.
// "Entered" = logged in, or chose "Continue as guest" on the welcome screen.

import { apiFetch, configureHttp } from './http.js';
import { moveDraft, setAdapter } from './repository.js';
import { apiAdapter } from './adapters/api.js';
import { guestAdapter } from './adapters/guest.js';
import { refreshProgram } from '../program/store.js';
import { resetPlace } from '../program/place.js';

const KEY = 'puntti.auth.v1';
const GUEST_KEY = 'puntti.guest.v1';
const listeners = new Set();

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return v?.token && v?.user ? v : null;
  } catch {
    return null;
  }
}

let state = read(); // { token, user: { id, username } } | null
let guestChosen = (() => {
  try {
    return localStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
})();

function persist() {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function apply() {
  if (state) setAdapter(apiAdapter, `user:${state.user.id}`);
  else setAdapter(guestAdapter, 'guest');
  refreshProgram();
  resetPlace();
  listeners.forEach((fn) => fn());
}

export const getUser = () => state?.user ?? null;
export const hasEntered = () => Boolean(state) || guestChosen;

function setGuestChosen(value) {
  guestChosen = value;
  try {
    if (value) localStorage.setItem(GUEST_KEY, '1');
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
}

export function continueAsGuest() {
  setGuestChosen(true);
  apply();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function login(username, password) {
  const res = await apiFetch('/api/auth/login', { method: 'POST', body: { username, password }, auth: false });
  // Keep an unfinished guest workout when logging in mid-workout.
  moveDraft('guest', `user:${res.user.id}`);
  state = { token: res.token, user: res.user };
  setGuestChosen(false);
  persist();
  apply();
  return res.user;
}

export async function changePassword(currentPassword, newPassword) {
  await apiFetch('/api/auth/password', { method: 'POST', body: { currentPassword, newPassword } });
}

/** Back to the welcome screen. */
export function logout() {
  state = null;
  setGuestChosen(false);
  persist();
  apply();
}

/** Check the saved token is still valid (a 401 logs out via the http handler). */
export async function verify() {
  if (!state) return;
  try {
    const { user } = await apiFetch('/api/auth/me');
    state = { ...state, user };
    persist();
  } catch {
    /* offline: stay logged in; 401 is handled below */
  }
}

configureHttp({ tokenProvider: () => state?.token, unauthorizedHandler: logout });

// Old pre-login test data — no longer used.
try {
  localStorage.removeItem('puntti.sessions.v1');
  localStorage.removeItem('puntti.draft.v1');
} catch {
  /* ignore */
}

apply();
