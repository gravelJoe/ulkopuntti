import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { activeWorkoutsAt, getWorkout, slotSummary, trainingMode, workoutBadge, workoutForDay } from '../program/store.js';
import { detectPlaceOnLaunch, usePlace } from '../program/place.js';
import { clearDraft, getLastSessionDates, isGuest, loadDraft, markFinishedToday, wasFinishedToday } from '../data/repository.js';
import { useAuth } from '../hooks/useAuth.js';
import { progress } from '../workout/session.js';
import { formatRelativeDate, formatTime, isToday } from '../utils/format.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { InsetGroup, LargeTitle, ListRow } from '../components/ui.jsx';

// Auto-open today's workout only once per app launch — coming back to Home
// later (e.g. with the back button) never bounces you into it again. Also
// cancelled as soon as the user taps something themselves.
let autoOpenChecked = false;


/**
 * Has today's workout already been done? Checks this phone first, then the
 * saved history (covers another device, or a workout finished before this
 * phone kept track). If the server is slow (free plan waking up), give up
 * after 1.5 s and go by what the phone knows.
 */
async function doneToday(workoutId) {
  if (wasFinishedToday(workoutId)) return true;
  if (isGuest()) return false;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
  const dates = await Promise.race([getLastSessionDates().catch(() => null), timeout]);
  if (dates && isToday(dates[workoutId])) {
    markFinishedToday(workoutId);
    return true;
  }
  return false;
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [lastDates, setLastDates] = useState({});
  const [draft, setDraft] = useState(null);
  const placeState = usePlace();
  // Outdoor-only / indoor-only users: no waiting for detection.
  const mode = trainingMode();
  const place = mode === 'both' ? placeState.place : mode;

  /** Any tap by the user cancels the pending auto-open. */
  function go(path, options) {
    autoOpenChecked = true;
    navigate(path, options);
  }

  // "Monday saved" banner after a workout finishes automatically.
  const location = useLocation();
  const [savedWorkout, setSavedWorkout] = useState(location.state?.savedWorkout ?? null);
  useEffect(() => {
    if (!location.state?.savedWorkout) return;
    navigate('.', { replace: true, state: null }); // don't show it again on reload
    const id = setTimeout(() => setSavedWorkout(null), 5000);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when the account changes (log in / log out switch data).
  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await loadDraft();
      if (!alive) return;
      // Only offer to resume if something was actually done.
      const active = d && getWorkout(d.workoutId) && progress(d).done > 0 ? d : null;
      setDraft(active);
      getLastSessionDates()
        .catch(() => ({}))
        .then((dates) => alive && setLastDates(dates));

      // Open today's workout for where we are (indoor/outdoor). Not if it's
      // already done today, or if a different workout is in progress.
      const detecting = detectPlaceOnLaunch(); // always runs once per launch; instant unless "Both"
      if (!autoOpenChecked) {
        const here = await detecting;
        if (!alive || autoOpenChecked) return; // a newer run took over, or the user tapped something
        const today = workoutForDay(new Date(), here);
        const open = today && (!active || active.workoutId === today.id) && !(await doneToday(today.id));
        if (!alive || autoOpenChecked) return;
        autoOpenChecked = true;
        if (open) navigate(`/workout/${today.id}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const draftProgress = draft ? progress(draft) : null;
  const draftWorkout = draft ? getWorkout(draft.workoutId) : null;

  async function startWorkout(id) {
    if (draft && draft.workoutId !== id) {
      const ok = await confirm({
        title: `Discard ${draftWorkout.name}?`,
        message: `You have ${draftProgress.done} sets done in a workout that isn't finished. Starting a new one discards it.`,
        confirmLabel: 'Discard',
        destructive: true,
      });
      if (!ok) return;
      await clearDraft();
    }
    go(`/workout/${id}`);
  }

  async function discardDraft() {
    const ok = await confirm({
      title: `Discard ${draftWorkout.name}?`,
      message: "The workout in progress won't be saved.",
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (!ok) return;
    autoOpenChecked = true;
    await clearDraft();
    setDraft(null);
  }

  const workoutsHere = activeWorkoutsAt(place);

  return (
    <main className="screen">
      <LargeTitle title="Puntti" />

      {savedWorkout && (
        <div className="saved-banner" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
          {savedWorkout} done and saved
        </div>
      )}

      {draft && (
        <InsetGroup header="In progress">
          <ListRow
            className="workout-row"
            onClick={() => go(`/workout/${draft.workoutId}`)}
            leading={<span className="workout-badge">{workoutBadge(draft.workoutId)}</span>}
            chevron
          >
            <div className="row-title">Resume {draftWorkout.name}</div>
            <div className="row-subtitle">
              {draftProgress.done} of {draftProgress.total} sets done
            </div>
            <div className="row-meta">Started {formatTime(draft.startedAt)}</div>
          </ListRow>
          <ListRow onClick={discardDraft}>
            <div className="row-action">Discard workout</div>
          </ListRow>
        </InsetGroup>
      )}

      <InsetGroup header={draft ? 'Start new' : 'Start workout'}>
        {workoutsHere.length === 0 && (
          <div className="list-row empty-state">No {place} workouts yet.</div>
        )}
        {workoutsHere.length === 0 && user && (
          <ListRow onClick={() => go('/settings/workouts/new', { state: { place } })} chevron>
            <div className="row-action">Create {place === 'indoor' ? 'an indoor' : 'an outdoor'} workout</div>
          </ListRow>
        )}
        {workoutsHere.map((w) => (
          <ListRow
            key={w.id}
            className="workout-row"
            onClick={() => startWorkout(w.id)}
            leading={<span className={`workout-badge${draft ? ' is-muted' : ''}`}>{workoutBadge(w.id)}</span>}
            chevron
          >
            <div className="row-title">{w.name}</div>
            <div className="row-subtitle">{slotSummary(w)}</div>
            {user && (
              <div className="row-meta">
                {lastDates[w.id] ? `Last: ${formatRelativeDate(lastDates[w.id])}` : 'Not done yet'}
              </div>
            )}
          </ListRow>
        ))}
      </InsetGroup>

      <InsetGroup>
        <ListRow onClick={() => go('/history')} chevron>
          <div className="row-title">History</div>
        </ListRow>
        <ListRow onClick={() => go('/settings')} chevron>
          <div className="row-title">Settings</div>
          {!user && <div className="row-meta">Guest mode · log in here</div>}
        </ListRow>
      </InsetGroup>
    </main>
  );
}
