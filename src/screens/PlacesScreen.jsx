import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { hasLocation, indoorGyms, ownPlates, trainingMode, useProgram } from '../program/store.js';
import { InsetGroup, LargeTitle, ListRow, NavBar } from '../components/ui.jsx';

export default function PlacesScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useProgram();
  if (!user) return <Navigate to="/settings" replace />;

  const gyms = indoorGyms();

  return (
    <main className="screen">
      <NavBar backLabel="Settings" backTo="/settings" />
      <LargeTitle title="Indoor gyms" />

      <InsetGroup
        footer={
          trainingMode() === 'both'
            ? 'When you open the app at one of these (saved location needed), it shows your indoor workouts; anywhere else, your outdoor ones. Your location is only checked on your phone.'
            : 'Each gym has its own plates and bars, and your weights are remembered per gym. All gyms share your indoor workouts.'
        }
      >
        {gyms.map((g) => (
          <ListRow key={g.id} onClick={() => navigate(`/settings/places/${g.id}`)} chevron>
            <div className="row-title">{g.name}</div>
            <div className="row-meta">
              {g.plateSource === 'own' ? 'My own plates' : `${g.plates.length} plate sizes`} · {g.bars.length}{' '}
              {g.bars.length === 1 ? 'bar' : 'bars'}
              {hasLocation(g) ? ' · location saved' : ''}
            </div>
          </ListRow>
        ))}
        <ListRow onClick={() => navigate('/settings/places/new')}>
          <div className="row-action">+ Add indoor gym</div>
        </ListRow>
      </InsetGroup>

      <InsetGroup footer="If you bring your own plates, set them up once here and choose “My own plates” for the gym.">
        <ListRow onClick={() => navigate('/settings/plates')} chevron>
          <div className="row-title">My own plates</div>
          <div className="row-meta">{ownPlates().length ? `${ownPlates().length} plate sizes` : 'Not set up'}</div>
        </ListRow>
      </InsetGroup>
    </main>
  );
}
