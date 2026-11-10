// Where the user is training right now: 'outdoor' or 'indoor'.
//
// Settings → "Where do you train?":
//   Outdoor / Indoor → always that place; location is never requested.
//   Both             → once per app launch the phone is located (on the
//                      device only) and matched against the user's indoor gyms.
// Indoors we also need to know WHICH gym (plates, bars, weights are per gym):
// one gym → that one; several → GPS if they have locations, else the
// workout screen asks.

import { useSyncExternalStore } from 'react';
import { currentScope } from '../data/repository.js';
import { distanceMeters, getPosition } from '../utils/geo.js';
import { hasLocation, indoorGyms, programLoaded, trainingMode } from './store.js';

const key = () => `puntti.place.v1:${currentScope()}`;

function readLast() {
  try {
    return localStorage.getItem(key()) === 'indoor' ? 'indoor' : 'outdoor';
  } catch {
    return 'outdoor';
  }
}

// source: 'last' (not checked yet) | 'setting' | 'detected' | 'unavailable' | 'no-gyms' | 'chosen'
// gymId: the indoor gym we're at, or null if unknown (the workout screen then asks).
let state = { place: 'outdoor', source: 'last', gym: null, gymId: null };
const listeners = new Set();

function set(patch) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(key(), state.place);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export const getPlaceState = () => state;

export function subscribePlace(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** { place, source, gym, gymId } — re-renders on change. */
export function usePlace() {
  return useSyncExternalStore(subscribePlace, getPlaceState);
}

/** After adding a gym "here", or picking one on the workout screen. */
export function markAtGym(gymId, name, source = 'detected') {
  set({ place: 'indoor', source, gym: name, gymId });
}

let launchDetection = null;

/** Works out the place (and indoor gym) once per launch and per account. */
export function detectPlaceOnLaunch() {
  launchDetection ??= detect();
  return launchDetection;
}

/** Account or setting changed: start over. */
export function resetPlace() {
  launchDetection = null;
  state = { place: readLast(), source: 'last', gym: null, gymId: null };
  listeners.forEach((fn) => fn());
}

/** The gym (with a saved location) we're inside, or null. Throws if location is unavailable. */
async function nearestGym(gyms) {
  const here = await getPosition(5000);
  return (
    gyms
      .map((g) => ({ g, d: distanceMeters(here, g) }))
      .filter(({ g, d }) => d <= g.radius)
      .sort((a, b) => a.d - b.d)[0]?.g ?? null
  );
}

async function detect() {
  await programLoaded();
  const mode = trainingMode();
  const gyms = indoorGyms();
  const locatable = gyms.filter(hasLocation);

  if (mode === 'outdoor') {
    set({ place: 'outdoor', source: 'setting', gym: null, gymId: null });
    return state.place;
  }

  if (mode === 'indoor') {
    // Always indoors — only the gym needs working out.
    if (gyms.length === 1) {
      set({ place: 'indoor', source: 'setting', gym: gyms[0].name, gymId: gyms[0].id });
    } else {
      set({ place: 'indoor', source: 'setting', gym: null, gymId: null });
      if (locatable.length) {
        try {
          const g = await nearestGym(locatable);
          if (g) set({ gym: g.name, gymId: g.id, source: 'detected' });
        } catch {
          /* unknown — the workout screen will ask */
        }
      }
    }
    return state.place;
  }

  // 'both': indoors only if we're at one of the gyms.
  if (locatable.length === 0) {
    set({ place: 'outdoor', source: 'no-gyms', gym: null, gymId: null });
    return state.place;
  }
  try {
    const g = await nearestGym(locatable);
    set(g ? { place: 'indoor', source: 'detected', gym: g.name, gymId: g.id } : { place: 'outdoor', source: 'detected', gym: null, gymId: null });
  } catch {
    set({ source: 'unavailable', gym: null, gymId: null }); // keep the last known place
  }
  return state.place;
}
