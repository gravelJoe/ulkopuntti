import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { REST_SECONDS } from '../config/workouts.js';
import {
  getRestSeconds,
  REST_MAX_SECONDS,
  REST_MIN_SECONDS,
  REST_STEP_SECONDS,
  setRestSeconds,
} from '../data/preferences.js';
import { useAuth } from '../hooks/useAuth.js';
import { activeExercises, activeWorkouts, activeWorkoutsAt, getProgram, indoorGyms, saveProgram, trainingMode } from '../program/store.js';
import { detectPlaceOnLaunch, resetPlace } from '../program/place.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { InsetGroup, LargeTitle, ListRow, NavBar, SegmentedControl } from '../components/ui.jsx';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const formatClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function RestTimerSetting() {
  const [seconds, setSeconds] = useState(getRestSeconds);

  function change(next) {
    const clamped = Math.min(REST_MAX_SECONDS, Math.max(REST_MIN_SECONDS, next));
    setSeconds(clamped);
    setRestSeconds(clamped);
  }

  return (
    <InsetGroup
      header="Default timer"
      footer={
        seconds === REST_SECONDS ? (
          'Starts after each set.'
        ) : (
          <>
            Starts after each set.{' '}
            <button className="inline-link" onClick={() => change(REST_SECONDS)}>
              Reset to {formatClock(REST_SECONDS)}
            </button>
          </>
        )
      }
      padded
    >
      <div className="stepper">
        <button
          className="stepper-btn"
          aria-label={`Default timer: ${REST_STEP_SECONDS} seconds shorter`}
          disabled={seconds <= REST_MIN_SECONDS}
          onClick={() => change(seconds - REST_STEP_SECONDS)}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14" /></svg>
        </button>
        <div className="stepper-value" aria-live="polite" aria-label={`Default timer ${formatClock(seconds)}`}>
          {formatClock(seconds)}
          <span className="stepper-unit">min</span>
        </div>
        <button
          className="stepper-btn"
          aria-label={`Default timer: ${REST_STEP_SECONDS} seconds longer`}
          disabled={seconds >= REST_MAX_SECONDS}
          onClick={() => change(seconds + REST_STEP_SECONDS)}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14M10 3v14" /></svg>
        </button>
      </div>
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

      <RestTimerSetting />

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
