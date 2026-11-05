import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { exerciseName, getWorkout } from '../config/workouts.js';
import { deleteSession, listSessions } from '../data/repository.js';
import { formatDuration, formatLongDate, formatTime, formatWeight, formatWeightChange } from '../utils/format.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { InsetGroup, LargeTitle, ListRow, NavBar } from '../components/ui.jsx';

export default function SessionDetailScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const justFinished = useLocation().state?.justFinished;
  const [data, setData] = useState(undefined); // undefined = loading, null = not found
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    listSessions().then((all) => {
      if (!alive) return;
      const i = all.findIndex((s) => s.id === sessionId);
      if (i < 0) return setData(null);
      // Sessions are newest first, so everything after i is older.
      const older = all.slice(i + 1);
      const previousWeight = (exerciseId) =>
        older.find((s) => s.exercises.some((e) => e.exerciseId === exerciseId))?.exercises.find(
          (e) => e.exerciseId === exerciseId,
        ).weight;
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
            </ListRow>
          );
        })}
      </InsetGroup>

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
