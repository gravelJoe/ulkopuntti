import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { exerciseName, getWorkout } from '../program/store.js';
import { deleteSession, isGuest, listSessions, saveSession } from '../data/repository.js';
import { formatDuration, formatLongDate, formatTime, formatWeight, formatWeightChange } from '../utils/format.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { InsetGroup, LargeTitle, ListRow, NavBar, SegmentedControl } from '../components/ui.jsx';

const RESULTS = [
  { value: 'success', label: 'Go up' },
  { value: 'neutral', label: 'Repeat' },
  { value: 'fail', label: 'Go down' },
];

export default function SessionDetailScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const justFinished = useLocation().state?.justFinished;
  const [data, setData] = useState(undefined); // undefined = loading, null = not found
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let alive = true;
    listSessions().then((all) => {
      if (!alive) return;
      const i = all.findIndex((s) => s.id === sessionId);
      if (i < 0) return setData(null);
      // Sessions are newest first, so everything after i is older.
      // Entries with no set done (e.g. a Go down without lifting) aren't a weight.
      const older = all.slice(i + 1);
      const lifted = (e, exerciseId) => e.exerciseId === exerciseId && e.sets.some(Boolean);
      const previousWeight = (exerciseId) =>
        older.find((s) => s.exercises.some((e) => lifted(e, exerciseId)))?.exercises.find((e) => lifted(e, exerciseId))
          .weight;
      setData({ session: all[i], previousWeight });
    }, (err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  if (data === null) return <Navigate to="/history" replace />;
  if (error)
    return (
      <main className="screen">
        <NavBar backLabel="History" backTo="/history" />
        <InsetGroup>
          <div className="list-row empty-state">{error}</div>
        </InsetGroup>
      </main>
    );
  if (!data) return <main className="screen" />;

  const { session, previousWeight } = data;
  const workoutName = getWorkout(session.workoutId)?.name ?? session.workoutId;
  // Indoor workouts of logged-in users: the result of each exercise can be changed.
  const editable = session.place === 'indoor' && !isGuest();

  /**
   * Change one exercise's result. The stored workout is sent back unchanged
   * apart from that result (same id and finishedAt), so it stays in the same
   * week and place in the list; the server updates it in place.
   */
  async function changeOutcome(exerciseId, outcome) {
    const before = session;
    const updated = {
      ...session,
      exercises: session.exercises.map((e) => (e.exerciseId === exerciseId ? { ...e, outcome } : e)),
    };
    setData((d) => ({ ...d, session: updated }));
    setSaving(true);
    setSaveError('');
    try {
      await saveSession(updated);
    } catch (err) {
      setData((d) => ({ ...d, session: before }));
      setSaveError(`Couldn't save the result: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete workout?',
      message: 'It will be removed from history. This can’t be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteSession(session.id);
      navigate('/history', { replace: true });
    } catch (err) {
      await confirm({ title: "Couldn't delete", message: err.message, confirmLabel: 'OK', cancelLabel: null });
    }
  }

  return (
    <main className="screen">
      {justFinished ? <div className="navbar" /> : <NavBar backLabel="History" backTo="/history" />}
      <LargeTitle
        title={workoutName}
        subtitle={`${formatLongDate(session.finishedAt)} · ${formatTime(session.startedAt)} · ${formatDuration(
          session.startedAt,
          session.finishedAt,
        )}`}
      />

      {justFinished && (
        <div className="saved-banner" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
          Workout saved
        </div>
      )}

      <InsetGroup header="Exercises">
        {session.exercises.map((ex) => {
          const done = ex.sets.filter(Boolean).length;
          const prev = previousWeight(ex.exerciseId);
          const change = prev != null ? formatWeightChange(ex.weight - prev) : null;
          return (
            <ListRow key={ex.exerciseId}>
              <div className="detail-row">
                <div>
                  <div className="row-title">{exerciseName(ex.exerciseId)}</div>
                  <div className="row-meta">
                    {done}/{ex.sets.length} sets
                    {change && <span className="weight-change"> · {change}</span>}
                  </div>
                </div>
                <div className="detail-weight">
                  {formatWeight(ex.weight)}
                  <span className="stepper-unit">kg</span>
                </div>
              </div>
              {editable && (
                <div className="detail-result">
                  <SegmentedControl
                    label={`${exerciseName(ex.exerciseId)} result`}
                    options={RESULTS}
                    value={ex.outcome ?? null}
                    disabled={saving}
                    onChange={(value) => value !== ex.outcome && changeOutcome(ex.exerciseId, value)}
                  />
                </div>
              )}
            </ListRow>
          );
        })}
      </InsetGroup>

      {saveError && (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      )}

      {justFinished && (
        <div className="detail-actions">
          <button className="button-primary" onClick={() => navigate('/', { replace: true })}>
            Back to Home
          </button>
        </div>
      )}

      <InsetGroup>
        <ListRow onClick={handleDelete}>
          <div className="row-action">Delete workout</div>
        </ListRow>
      </InsetGroup>
    </main>
  );
}
