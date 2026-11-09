import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exerciseName, getWorkout, workoutBadge } from '../program/store.js';
import { listSessions } from '../data/repository.js';
import { useAuth } from '../hooks/useAuth.js';
import { formatDuration, formatRelativeDate, formatWeight } from '../utils/format.js';
import { InsetGroup, LargeTitle, ListRow, NavBar } from '../components/ui.jsx';

export default function HistoryScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    return listSessions().then(setSessions, (err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  return (
    <main className="screen">
      <NavBar backLabel="Puntti" />
      <LargeTitle title="History" />

      {!user && (
        <InsetGroup footer="Guests can use the app, but workouts aren't saved.">
          <div className="list-row empty-state">Log in to save your workouts and see them here.</div>
          <ListRow onClick={() => navigate('/welcome', { state: { returnTo: '/history' } })} chevron>
            <div className="row-action">Log in</div>
          </ListRow>
        </InsetGroup>
      )}

      {user && error && (
        <InsetGroup>
          <div className="list-row empty-state">{error}</div>
          <ListRow onClick={load}>
            <div className="row-action">Try again</div>
          </ListRow>
        </InsetGroup>
      )}

      {user && !error && sessions?.length === 0 && (
        <InsetGroup>
          <div className="list-row empty-state">No workouts yet. Finished workouts show up here.</div>
        </InsetGroup>
      )}

      {user && !error && sessions?.length > 0 && (
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
                </div>
              </ListRow>
            );
          })}
        </InsetGroup>
      )}
    </main>
  );
}
