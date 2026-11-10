import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { activeWorkoutsAt, indoorGyms, slotSummary, trainingMode, useProgram, weekdayName, WEEKDAYS } from '../program/store.js';
import { InsetGroup, LargeTitle, ListRow, NavBar } from '../components/ui.jsx';

// Monday-first order for workouts that have a day; the rest after.
const dayOrder = (w) => (w.weekday === null ? 99 : WEEKDAYS.findIndex((d) => d.value === w.weekday));

export default function WorkoutsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useProgram();
  if (!user) return <Navigate to="/settings" replace />;

  const groups = [
    { place: 'outdoor', header: 'Outdoor', list: activeWorkoutsAt('outdoor') },
    { place: 'indoor', header: 'Indoor', list: activeWorkoutsAt('indoor') },
  ];
  const mode = trainingMode();
  const grouped = mode === 'both';
  const shown = groups.filter((g) => grouped || g.place === mode);
  const hidden = groups.find((g) => !grouped && g.place !== mode && g.list.length > 0);

  return (
    <main className="screen">
      <NavBar backLabel="Settings" backTo="/settings" />
      <LargeTitle title="Workouts" />

      {shown.map((g) => (
          <InsetGroup
            key={g.place}
            header={grouped ? g.header : null}
            footer={
              !grouped
                ? `A workout with a day opens automatically on that day.${
                    hidden ? ` You also have ${hidden.list.length} ${hidden.place} workout${hidden.list.length === 1 ? '' : 's'}, shown when you train ${hidden.place}s.` : ''
                  }`
                : g.place === 'outdoor'
                  ? 'Shown when you are not at an indoor gym.'
                  : indoorGyms().length
                    ? 'Shown when you are at any of your indoor gyms.'
                    : 'Add your indoor gyms in Settings so the app can recognise them.'
            }
          >
            {g.list
              .slice()
              .sort((a, b) => dayOrder(a) - dayOrder(b))
              .map((w) => (
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
            <ListRow onClick={() => navigate('/settings/workouts/new', { state: { place: g.place } })}>
              <div className="row-action">+ New {grouped ? `${g.place} ` : ''}workout</div>
            </ListRow>
          </InsetGroup>
        ))}
    </main>
  );
}
