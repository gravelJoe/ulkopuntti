// Dev-only test controls (loaded only in `npm run dev`, never in production).
// Simulated time shifts Luxon's DateTime.now() via utils/clock.js; the rest
// timer keeps real time. Styles are inline so production CSS has none of this.
import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { offsetMs, setOffset } from '../utils/clock.js';
import { LOCALE } from '../utils/dates.js';
import { clearDraft, currentScope, loadDraft } from '../data/repository.js';
import { indoorGyms } from '../program/store.js';
import { markAtGym, markOutdoor } from '../program/place.js';

const DAY = 864e5;
const OFFLINE_KEY = 'puntti.dev.offline';

const readFlag = (key) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const s = {
  banner: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '4px 12px',
    background: '#7c3aed', color: '#fff', font: '600 12px/1.4 system-ui', textAlign: 'center',
  },
  fab: {
    position: 'fixed', right: 12, bottom: 'calc(env(safe-area-inset-bottom) + 12px)', zIndex: 1000,
    width: 44, height: 44, borderRadius: 22, background: '#7c3aed', color: '#fff', font: '700 13px system-ui',
    boxShadow: '0 2px 8px rgb(0 0 0 / 0.3)',
  },
  sheet: {
    position: 'fixed', left: 8, right: 8, bottom: 'calc(env(safe-area-inset-bottom) + 64px)', zIndex: 1000,
    maxHeight: '70vh', overflow: 'auto', padding: 12, borderRadius: 14, background: '#1f1f23', color: '#fff',
    font: '14px/1.4 system-ui', boxShadow: '0 6px 24px rgb(0 0 0 / 0.4)',
  },
  h: { margin: '10px 0 6px', font: '700 12px system-ui', textTransform: 'uppercase', opacity: 0.7 },
  row: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  btn: { padding: '8px 10px', borderRadius: 8, background: '#3a3a40', color: '#fff', font: '600 13px system-ui' },
  note: { margin: '4px 0 0', fontSize: 12, opacity: 0.7 },
};

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [offline, setOfflineFlag] = useState(() => readFlag(OFFLINE_KEY));
  const [done, setDone] = useState('');
  const offset = offsetMs();
  const simulated = DateTime.now().setLocale(LOCALE);

  // Changing the time mid-workout would mix real and simulated times in one workout.
  useEffect(() => {
    if (open) loadDraft().then((d) => setHasDraft(Boolean(d)));
  }, [open]);

  const flash = (text) => {
    setDone(text);
    setTimeout(() => setDone(''), 1500);
  };
  const shift = (days) => setOffset(offset + days * DAY);
  const remove = (key, text) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    flash(text);
  };

  function toggleOffline() {
    const next = !offline;
    try {
      if (next) localStorage.setItem(OFFLINE_KEY, '1');
      else localStorage.removeItem(OFFLINE_KEY);
    } catch {
      /* ignore */
    }
    setOfflineFlag(next);
  }

  return (
    <>
      {(offset !== 0 || offline) && (
        <div style={s.banner} role="status">
          {offset !== 0 && `Simulated: ${simulated.toFormat('ccc d LLL yyyy')}`}
          {offset !== 0 && offline && ' · '}
          {offline && 'Offline (simulated)'}
        </div>
      )}

      <button style={s.fab} onClick={() => setOpen((o) => !o)} aria-label="Dev test controls">
        DEV
      </button>

      {open && (
        <div style={s.sheet} role="dialog" aria-label="Dev test controls">
          <div style={s.h}>Time · {simulated.toFormat('ccc d LLL')}</div>
          <div style={s.row}>
            <button style={s.btn} disabled={hasDraft} onClick={() => shift(-7)}>◀ week</button>
            <button style={s.btn} disabled={hasDraft} onClick={() => shift(-1)}>◀ day</button>
            <button style={s.btn} disabled={hasDraft} onClick={() => shift(1)}>day ▶</button>
            <button style={s.btn} disabled={hasDraft} onClick={() => shift(7)}>week ▶</button>
            <button style={s.btn} disabled={hasDraft || offset === 0} onClick={() => setOffset(0)}>Reset</button>
          </div>
          <p style={s.note}>
            {hasDraft
              ? 'Save or discard the workout in progress first.'
              : 'Reloads the app. Workouts saved now get the simulated date (dev database only).'}
          </p>

          <div style={s.h}>Network & data</div>
          <div style={s.row}>
            <button style={s.btn} onClick={toggleOffline}>{offline ? 'Go online' : 'Simulate offline'}</button>
            <button style={s.btn} onClick={() => remove(`puntti.history.v1:${currentScope()}`, 'History cache cleared')}>
              Clear history cache
            </button>
            <button style={s.btn} onClick={() => clearDraft().then(() => { setHasDraft(false); flash('Draft cleared'); })}>
              Clear draft
            </button>
            <button style={s.btn} onClick={() => remove(`puntti.finished.v1:${currentScope()}`, '"Done today" cleared')}>
              Clear “done today”
            </button>
          </div>

          <div style={s.h}>Place (Both mode)</div>
          <div style={s.row}>
            <button style={s.btn} onClick={() => { markOutdoor(); flash('Outdoor'); }}>Outdoor</button>
            {indoorGyms().map((g) => (
              <button key={g.id} style={s.btn} onClick={() => { markAtGym(g.id, g.name, 'chosen'); flash(`At ${g.name}`); }}>
                {g.name}
              </button>
            ))}
          </div>
          <p style={s.note}>Lasts until the next reload (location is detected again on launch).</p>

          {done && <p style={{ ...s.note, opacity: 1, color: '#a7f3d0' }}>{done}</p>}
        </div>
      )}
    </>
  );
}
