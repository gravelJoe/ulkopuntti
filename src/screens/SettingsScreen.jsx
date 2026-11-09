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
import { activeExercises, activeWorkouts } from '../program/store.js';
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
