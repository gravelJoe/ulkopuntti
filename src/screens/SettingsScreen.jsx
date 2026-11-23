import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { REST_SECONDS } from '../config/workouts.js';
import { getRestSeconds, setRestSeconds } from '../data/preferences.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  activeExercises,
  activeWorkouts,
  activeWorkoutsAt,
  alarmTune,
  getProgram,
  holdWeeks,
  indoorGyms,
  programLoaded,
  refreshProgram,
  ringWhenSilent,
  saveProgram,
  trainingMode,
  useProgram,
} from '../program/store.js';
import { detectPlaceOnLaunch, resetPlace } from '../program/place.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { InsetGroup, LargeTitle, ListRow, NavBar, SegmentedControl } from '../components/ui.jsx';
import RestStepper from '../components/RestStepper.jsx';
import { formatSeconds } from '../utils/format.js';
import { playTune, stopTune, unlockAudio } from '../utils/alert.js';
import { TUNE_IDS, TUNES, tuneIdOrDefault } from '../utils/tunes.js';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Weeks a lowered weight is held after a Go down (indoor progression), synced with the account. */
function HoldSetting() {
  const [weeks, setWeeks] = useState(holdWeeks);
  const [error, setError] = useState('');

  async function change(next) {
    const value = Math.max(0, Math.round(next));
    const before = weeks;
    setWeeks(value);
    setError('');
    try {
      await saveProgram({ ...getProgram(), holdWeeks: value });
    } catch (err) {
      setWeeks(before);
      setError(err.message);
    }
  }

  return (
    <InsetGroup
      header="Hold after a fail"
      footer={error || 'After a Go down, the lower weight stays for this many trained weeks before it can go up again. 0 or 1 = no extra hold.'}
      padded
    >
      <div className="stepper">
        <button className="stepper-btn" aria-label="One week less" disabled={weeks <= 0} onClick={() => change(weeks - 1)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14" /></svg>
        </button>
        <div className="stepper-value" aria-live="polite">
          {weeks === 0 ? 'No hold' : weeks}
          {weeks > 0 && <span className="stepper-unit">{weeks === 1 ? 'week' : 'weeks'}</span>}
        </div>
        <button className="stepper-btn" aria-label="One week more" onClick={() => change(weeks + 1)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14M10 3v14" /></svg>
        </button>
      </div>
    </InsetGroup>
  );
}

function RestTimerSetting() {
  const [seconds, setSeconds] = useState(getRestSeconds);

  function change(next) {
    setSeconds(next);
    setRestSeconds(next);
  }

  const text = 'Runs between sets of the same exercise. Exercises can have their own rest.';
  return (
    <InsetGroup
      header="Default timer"
      footer={
        seconds === REST_SECONDS ? (
          text
        ) : (
          <>
            {text}{' '}
            <button className="inline-link" onClick={() => change(REST_SECONDS)}>
              Reset to {formatSeconds(REST_SECONDS)}
            </button>
          </>
        )
      }
      padded
    >
      <RestStepper label="Default timer" value={seconds} onChange={change} />
    </InsetGroup>
  );
}

const RING_OPTIONS = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
];

/**
 * The rest alarm: tune and "Ring even when silent" (saved with the account),
 * plus Test sound. Guests get Test sound only (their default program plays
 * beep, ringing in silent mode).
 */
function AlarmSetting({ loggedIn }) {
  useProgram(); // re-render when the program changes (load, save, rollback)
  const tune = tuneIdOrDefault(alarmTune()); // an id from a newer app shows as Beep, unsaved
  const ring = ringWhenSilent();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  // Load the latest program before allowing a save, so a stale copy can't
  // overwrite a newer one (programLoaded gives up after 3 s).
  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    refreshProgram();
    programLoaded().then(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [loggedIn]);

  // Leaving Settings stops a test.
  useEffect(() => () => stopTune(), []);

  async function save(next) {
    // SegmentedControl keeps the selected option tappable even when disabled, so guard here.
    if (saving || !loaded) return;
    setSaving(true);
    setError('');
    try {
      await saveProgram(next);
    } catch (err) {
      setError(err.message); // saveProgram has already put the old value back
    }
    setSaving(false);
  }

  function pickTune(id) {
    if (id === tune) return;
    if (testing) {
      stopTune();
      setTesting(false);
    }
    save({ ...getProgram(), alarmTune: id });
  }

  function pickRing(value) {
    if (value === ring) return;
    save({ ...getProgram(), ringWhenSilent: value });
  }

  function toggleTest() {
    if (testing) {
      stopTune();
      setTesting(false);
      return;
    }
    unlockAudio(); // inside the tap
    setTesting(true);
    playTune(alarmTune(), { ringWhenSilent: ringWhenSilent(), onEnded: () => setTesting(false) });
  }

  const locked = saving || !loaded;
  return (
    <InsetGroup
      header="Rest alarm"
      footer={error || 'On iPhone the alarm needs Puntti open on screen. On Android it plays at media volume.'}
    >
      {loggedIn ? (
        <>
          {TUNE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="list-row picker-row"
              aria-pressed={id === tune}
              disabled={locked}
              onClick={() => pickTune(id)}
            >
              <span className="list-row-content row-title">{TUNES[id].label}</span>
              {id === tune && (
                <span className="picker-check is-on" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
          <div className="list-row">
            <div className="list-row-content">
              <div className="row-title">Ring even when silent</div>
              <div className="row-subtitle">
                Plays in silent mode on iPhone. Pauses music when the alarm plays. Music does not resume by itself.
              </div>
              <div className="alarm-ring-control">
                <SegmentedControl
                  label="Ring even when silent"
                  options={RING_OPTIONS}
                  value={ring}
                  onChange={pickRing}
                  disabled={locked}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="list-row empty-state">Log in to choose a tune.</div>
      )}
      <ListRow onClick={toggleTest}>
        <div className="row-action">{testing ? 'Stop' : 'Test sound'}</div>
      </ListRow>
    </InsetGroup>
  );
}

const MODE_OPTIONS = [
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'indoor', label: 'Indoor' },
  { value: 'both', label: 'Both' },
];

function TrainingPlaceSetting() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const mode = trainingMode();
  const gyms = indoorGyms();
  const [error, setError] = useState('');

  async function change(next) {
    if (next === mode) return;
    setError('');
    const program = getProgram();
    let workouts = program.workouts;

    // Going indoor-only (or outdoor-only) with no workouts for that place yet:
    // offer to move the existing ones, so they don't just disappear from Home.
    if (next !== 'both' && activeWorkoutsAt(next).length === 0) {
      const other = next === 'indoor' ? 'outdoor' : 'indoor';
      const movable = activeWorkoutsAt(other);
      if (movable.length) {
        const ok = await confirm({
          title: `Use your workouts ${next}s?`,
          message: `${movable.map((w) => w.name).join(', ')} ${movable.length === 1 ? 'is an' : 'are'} ${other} workout${movable.length === 1 ? '' : 's'}. Make ${movable.length === 1 ? 'it' : 'them'} ${next}? Indoor and outdoor weights are tracked separately.`,
          confirmLabel: 'Yes, move',
          cancelLabel: 'No',
        });
        if (ok === null) return; // dismissed: no change
        if (ok) workouts = workouts.map((w) => (w.archived ? w : { ...w, place: next }));
      }
    }

    try {
      await saveProgram({ ...program, trainingMode: next, workouts });
      resetPlace();
      detectPlaceOnLaunch();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <InsetGroup
        header="Where do you train?"
        footer={
          mode === 'outdoor'
            ? 'Your workouts are outdoor workouts.'
            : mode === 'indoor'
              ? 'Your workouts are indoor workouts. Indoor weights are kept apart from outdoor ones.'
              : 'Each time the app opens it checks whether you are at one of your indoor gyms and shows those workouts — otherwise your outdoor ones. Your location stays on your phone.'
        }
        padded
      >
        <SegmentedControl label="Where do you train?" options={MODE_OPTIONS} value={mode} onChange={change} />
      </InsetGroup>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {mode !== 'outdoor' && (
        <InsetGroup
          footer={
            gyms.length
              ? null
              : mode === 'both'
                ? 'Add the indoor gyms you use so the app can recognise them.'
                : 'Add your gym with its plates and bars.'
          }
        >
          <ListRow onClick={() => navigate('/settings/places')} chevron>
            <div className="row-title">Indoor gyms</div>
            <div className="row-meta">
              {gyms.length === 0 ? 'None yet' : gyms.map((g) => g.name).join(', ')}
            </div>
          </ListRow>
        </InsetGroup>
      )}
    </>
  );
}

export default function SettingsScreen({ theme, setTheme }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user, logout } = useAuth();

  async function handleLogout() {
    const ok = await confirm({
      title: 'Log out?',
      message: 'Your history stays saved in your account.',
      confirmLabel: 'Log out',
    });
    if (ok) logout(); // the app then shows the welcome screen
  }

  return (
    <main className="screen">
      <NavBar backLabel="Puntti" />
      <LargeTitle title="Settings" />

      {user ? (
        <InsetGroup header="Program">
          <ListRow onClick={() => navigate('/settings/workouts')} chevron>
            <div className="row-title">Workouts</div>
            <div className="row-meta">{activeWorkouts().map((w) => w.name).join(', ') || 'None yet'}</div>
          </ListRow>
          <ListRow onClick={() => navigate('/settings/exercises')} chevron>
            <div className="row-title">Exercises</div>
            <div className="row-meta">{activeExercises().length} exercises</div>
          </ListRow>
        </InsetGroup>
      ) : (
        <InsetGroup header="Program">
          <div className="list-row empty-state">Log in to create and edit your own workouts.</div>
        </InsetGroup>
      )}

      {user && <TrainingPlaceSetting />}

      {user && trainingMode() !== 'outdoor' && <HoldSetting />}

      <RestTimerSetting />

      <AlarmSetting loggedIn={Boolean(user)} />

      <InsetGroup header="Appearance" padded>
        <SegmentedControl label="Appearance" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      </InsetGroup>

      {user ? (
        <InsetGroup header="Account">
          <ListRow>
            <div className="row-subtitle">Logged in as</div>
            <div className="row-title">{user.username}</div>
          </ListRow>
          <ListRow onClick={() => navigate('/account/password')} chevron>
            <div className="row-title">Change password</div>
          </ListRow>
          <ListRow onClick={handleLogout}>
            <div className="row-action">Log out</div>
          </ListRow>
        </InsetGroup>
      ) : (
        <InsetGroup header="Account" footer="As a guest, workouts aren't saved.">
          <ListRow onClick={() => navigate('/welcome', { state: { returnTo: '/settings' } })} chevron>
            <div className="row-subtitle">Guest mode</div>
            <div className="row-action">Log in</div>
          </ListRow>
        </InsetGroup>
      )}
    </main>
  );
}
