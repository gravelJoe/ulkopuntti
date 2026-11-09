import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { activeExercises, useProgram } from '../program/store.js';
import { formatWeight } from '../utils/format.js';
import { InsetGroup, LargeTitle, ListRow, NavBar } from '../components/ui.jsx';

export default function ExercisesScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useProgram();
  if (!user) return <Navigate to="/settings" replace />;

  const list = activeExercises().slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="screen">
      <NavBar backLabel="Settings" backTo="/settings" />
      <LargeTitle title="Exercises" />

      <InsetGroup footer="Deleting an exercise keeps its past results in History.">
        {list.map((e) => (
          <ListRow key={e.id} onClick={() => navigate(`/settings/exercises/${e.id}`)} chevron>
            <div className="row-title">{e.name}</div>
            <div className="row-meta">
              {e.sets} {e.sets === 1 ? 'set' : 'sets'} · {formatWeight(e.step)} kg steps
            </div>
          </ListRow>
        ))}
        <ListRow onClick={() => navigate('/settings/exercises/new')}>
          <div className="row-action">+ New exercise</div>
        </ListRow>
      </InsetGroup>
    </main>
  );
}
