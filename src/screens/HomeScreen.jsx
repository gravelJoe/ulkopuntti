import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getWorkout, slotSummary, workoutBadge, workouts } from '../config/workouts.js';
import { clearDraft, getLastSessionDates, loadDraft } from '../data/repository.js';
import { useAuth } from '../hooks/useAuth.js';
import { progress } from '../workout/session.js';
import { formatRelativeDate, formatTime } from '../utils/format.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { InsetGroup, LargeTitle, ListRow } from '../components/ui.jsx';

export default function HomeScreen() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [lastDates, setLastDates] = useState({});
  const [draft, setDraft] = useState(null);

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
      setDraft(d && getWorkout(d.workoutId) && progress(d).done > 0 ? d : null);
      const dates = await getLastSessionDates().catch(() => ({}));
      if (alive) setLastDates(dates);
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
    navigate(`/workout/${id}`);
  }

  async function discardDraft() {
    const ok = await confirm({
      title: `Discard ${draftWorkout.name}?`,
      message: "The workout in progress won't be saved.",
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (!ok) return;
    await clearDraft();
    setDraft(null);
  }

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
            onClick={() => navigate(`/workout/${draft.workoutId}`)}
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
        {workouts.map((w) => (
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
        <ListRow onClick={() => navigate('/history')} chevron>
          <div className="row-title">History</div>
        </ListRow>
        <ListRow onClick={() => navigate('/settings')} chevron>
          <div className="row-title">Settings</div>
          {!user && <div className="row-meta">Guest mode · log in here</div>}
        </ListRow>
      </InsetGroup>
    </main>
  );
}
