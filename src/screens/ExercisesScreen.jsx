import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { activeExercisesAt, PLACES, trainingMode, useProgram } from '../program/store.js';
import { formatWeight } from '../utils/format.js';
import { InsetGroup, LargeTitle, ListRow, NavBar, SegmentedControl } from '../components/ui.jsx';

export default function ExercisesScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  useProgram();
  if (!user) return <Navigate to="/settings" replace />;

  const mode = trainingMode();
  // Outdoor / Indoor tabs when both lists are in use; the tab lives in the URL
  // (?place=indoor) so coming back from an exercise keeps it.
  const showTabs = mode === 'both' || (activeExercisesAt('outdoor').length > 0 && activeExercisesAt('indoor').length > 0);
  const place = showTabs ? (params.get('place') === 'indoor' ? 'indoor' : 'outdoor') : mode === 'indoor' ? 'indoor' : 'outdoor';
  const list = activeExercisesAt(place)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="screen">
      <NavBar backLabel="Settings" backTo="/settings" />
      <LargeTitle title="Exercises" />

      {showTabs && (
        <div className="tabs">
          <SegmentedControl
            label="Outdoor or indoor exercises"
            options={PLACES}
            value={place}
            onChange={(p) => setParams({ place: p }, { replace: true })}
          />
        </div>
      )}

      <InsetGroup
        footer={
          place === 'indoor'
            ? 'Indoor exercises are separate from outdoor ones. Barbell exercises show which plates to load.'
            : 'Deleting an exercise keeps its past results in History.'
        }
      >
        {list.length === 0 && <div className="list-row empty-state">No {place} exercises yet.</div>}
        {list.map((e) => (
          <ListRow key={e.id} onClick={() => navigate(`/settings/exercises/${e.id}`)} chevron>
            <div className="row-title">{e.name}</div>
            <div className="row-meta">
              {place === 'indoor' ? (e.kind === 'barbell' ? 'Barbell · ' : 'Machine · ') : ''}
              {e.sets} {e.sets === 1 ? 'set' : 'sets'} · {formatWeight(e.step)} kg steps
            </div>
          </ListRow>
        ))}
        <ListRow onClick={() => navigate('/settings/exercises/new', { state: { place } })}>
          <div className="row-action">+ New {showTabs ? `${place} ` : ''}exercise</div>
        </ListRow>
      </InsetGroup>
    </main>
  );
}
