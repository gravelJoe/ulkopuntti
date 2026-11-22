import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { activeExercisesAt, exerciseName, getWorkout, workoutBadge } from '../program/store.js';
import { getSessionHistory, listSessions } from '../data/repository.js';
import { useAuth } from '../hooks/useAuth.js';
import { formatDuration, formatRelativeDate, formatWeight } from '../utils/format.js';
import { InsetGroup, LargeTitle, ListRow, NavBar, SegmentedControl } from '../components/ui.jsx';
import { RESULT_LABEL } from './ExerciseHistoryScreen.jsx';

const VIEWS = [
  { value: 'workout', label: 'By workout' },
  { value: 'exercise', label: 'By exercise' },
];

/** Indoor exercises with their latest weight and result. Works offline from the saved history. */
function ByExercise() {
  const navigate = useNavigate();
  const [data, setData] = useState(undefined); // undefined = loading

  useEffect(() => {
    let alive = true;
    getSessionHistory().then(({ sessions, offline }) => {
      if (alive) setData({ sessions: sessions ? sessions.filter((s) => s.place === 'indoor') : null, offline });
    });
    return () => {
      alive = false;
    };
  }, []);

  if (data === undefined) return null;
  if (data.sessions === null)
    return (
      <InsetGroup>
        <div className="list-row empty-state">No saved history on this phone yet. Connect once to see it.</div>
      </InsetGroup>
    );

  const exercises = activeExercisesAt('indoor');
  return (
    <InsetGroup footer={data.offline ? 'Offline: showing the history saved on this phone.' : 'Weekly history and the plan for next time.'}>
      {exercises.length === 0 && <div className="list-row empty-state">No indoor exercises yet.</div>}
      {exercises.map((ex) => {
        // Latest session with this exercise (newest first): a set done or a result.
        const latest = data.sessions
          .map((s) => s.exercises.find((e) => e.exerciseId === ex.id))
          .find((e) => e && (e.sets.some(Boolean) || e.outcome));
        return (
          <ListRow key={ex.id} onClick={() => navigate(`/history/exercise/${ex.id}`)} chevron>
            <div className="detail-row">
              <div>
                <div className="row-title">{ex.name}</div>
                <div className="row-meta">
                  {latest ? RESULT_LABEL[latest.outcome] ?? 'No result' : 'Not done yet'}
                </div>
              </div>
              {latest && (
                <div className="detail-weight">
                  {formatWeight(latest.weight)}
                  <span className="stepper-unit">kg</span>
                </div>
              )}
            </div>
          </ListRow>
        );
      })}
    </InsetGroup>
  );
}

export default function HistoryScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'exercise' ? 'exercise' : 'workout';
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    return listSessions().then(setSessions, (err) => setError(err.message));
  }, []);

  // By workout loads the list from the server (only when that view is open).
  useEffect(() => {
    if (user && view === 'workout') load();
  }, [user, view, load]);

  return (
    <main className="screen">
      <NavBar backLabel="Puntti" />
      <LargeTitle title="History" />

      {user && (
        <div className="history-views">
          <SegmentedControl
            label="History view"
            options={VIEWS}
            value={view}
            onChange={(v) => setParams(v === 'exercise' ? { view: 'exercise' } : {}, { replace: true })}
          />
        </div>
      )}

      {user && view === 'exercise' && <ByExercise />}

      {!user && (
        <InsetGroup footer="Guests can use the app, but workouts aren't saved.">
          <div className="list-row empty-state">Log in to save your workouts and see them here.</div>
          <ListRow onClick={() => navigate('/welcome', { state: { returnTo: '/history' } })} chevron>
            <div className="row-action">Log in</div>
          </ListRow>
        </InsetGroup>
      )}

      {user && view === 'workout' && error && (
        <InsetGroup>
          <div className="list-row empty-state">{error}</div>
          <ListRow onClick={load}>
            <div className="row-action">Try again</div>
          </ListRow>
        </InsetGroup>
      )}

      {user && view === 'workout' && !error && sessions?.length === 0 && (
        <InsetGroup>
          <div className="list-row empty-state">No workouts yet. Finished workouts show up here.</div>
        </InsetGroup>
      )}

      {user && view === 'workout' && !error && sessions?.length > 0 && (
        <InsetGroup>
          {sessions.map((s) => {
            const setsDone = s.exercises.reduce((n, ex) => n + ex.sets.filter(Boolean).length, 0);
            const setsTotal = s.exercises.reduce((n, ex) => n + ex.sets.length, 0);
            return (
              <ListRow
                key={s.id}
                onClick={() => navigate(`/history/${s.id}`)}
                leading={<span className="workout-badge is-small">{workoutBadge(s.workoutId)}</span>}
                chevron
              >
                <div className="row-title">
                  {formatRelativeDate(s.finishedAt)}
                  <span className="row-title-aside"> · {getWorkout(s.workoutId)?.name ?? s.workoutId}</span>
                </div>
                <div className="row-subtitle">
                  {s.exercises.map((ex) => `${exerciseName(ex.exerciseId)} ${formatWeight(ex.weight)}`).join(' · ')}
                </div>
                <div className="row-meta">
                  {setsDone}/{setsTotal} sets · {formatDuration(s.startedAt, s.finishedAt)}
                  {s.place === 'indoor' && ' · Indoor'}
                </div>
              </ListRow>
            );
          })}
        </InsetGroup>
      )}
    </main>
  );
}
