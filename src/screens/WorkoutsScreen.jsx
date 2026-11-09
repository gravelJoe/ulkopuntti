import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { activeWorkouts, slotSummary, useProgram, weekdayName, WEEKDAYS } from '../program/store.js';
import { InsetGroup, LargeTitle, ListRow, NavBar } from '../components/ui.jsx';

// Monday-first order for workouts that have a day; the rest after.
const dayOrder = (w) => (w.weekday === null ? 99 : WEEKDAYS.findIndex((d) => d.value === w.weekday));

export default function WorkoutsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useProgram();
  if (!user) return <Navigate to="/settings" replace />;

  const list = activeWorkouts().slice().sort((a, b) => dayOrder(a) - dayOrder(b));

  return (
    <main className="screen">
      <NavBar backLabel="Settings" backTo="/settings" />
      <LargeTitle title="Workouts" />

      <InsetGroup footer="A workout with a day opens automatically on that day.">
        {list.map((w) => (
          <ListRow
            key={w.id}
            className="workout-row"
            onClick={() => navigate(`/settings/workouts/${w.id}`)}
            leading={<span className="workout-badge">{w.badge}</span>}
            chevron
          >
            <div className="row-title">{w.name}</div>
            <div className="row-subtitle">{w.slots.length ? slotSummary(w) : 'No exercises yet'}</div>
            <div className="row-meta">{w.weekday === null ? 'No day' : `Every ${weekdayName(w.weekday)}`}</div>
          </ListRow>
        ))}
        <ListRow onClick={() => navigate('/settings/workouts/new')}>
          <div className="row-action">+ New workout</div>
        </ListRow>
      </InsetGroup>
    </main>
  );
}
