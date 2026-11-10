import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getProgram, hasLocation, indoorGyms, newId, ownPlates, saveProgram, trainingMode } from '../program/store.js';
import { markAtGym } from '../program/place.js';
import { getPosition } from '../utils/geo.js';
import { DEFAULT_BARS } from '../utils/plates.js';
import { formatWeight } from '../utils/format.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import PlateListEditor from '../components/PlateListEditor.jsx';
import { InsetGroup, LargeTitle, ListRow, NavBar, SegmentedControl } from '../components/ui.jsx';

const RADIUS_OPTIONS = [100, 200, 500, 1000].map((v) => ({ value: v, label: v < 1000 ? `${v} m` : '1 km' }));
const PLATE_SOURCE_OPTIONS = [
  { value: 'gym', label: "The gym's plates" },
  { value: 'own', label: 'My own plates' },
];

export default function GymEditScreen() {
  const { gymId } = useParams();
  const isNew = gymId === 'new';
  const existing = isNew ? null : indoorGyms().find((g) => g.id === gymId);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const mode = trainingMode();

  const [name, setName] = useState(existing?.name ?? '');
  const [spot, setSpot] = useState(hasLocation(existing) ? { lat: existing.lat, lon: existing.lon } : null);
  const [accuracy, setAccuracy] = useState(null);
  const [usedHere, setUsedHere] = useState(false); // location taken just now = we're at the gym
  const [radius, setRadius] = useState(existing?.radius ?? 200);
  const [plateSource, setPlateSource] = useState(existing?.plateSource ?? 'gym');
  const [plates, setPlates] = useState(existing?.plates ?? []);
  const [bars, setBars] = useState(existing?.bars ?? DEFAULT_BARS.map((b) => ({ ...b, id: newId('bar') })));
  const [barName, setBarName] = useState('');
  const [barWeight, setBarWeight] = useState('');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/settings" replace />;
  if (!isNew && !existing) return <Navigate to="/settings/places" replace />;

  async function useCurrentLocation() {
    setError('');
    setLocating(true);
    try {
      const p = await getPosition(15000);
      setSpot({ lat: p.lat, lon: p.lon });
      setAccuracy(Math.round(p.accuracy));
      setUsedHere(true);
    } catch (err) {
      setError(err.message);
    }
    setLocating(false);
  }

  function addBar(e) {
    e.preventDefault();
    const w = parseFloat(barWeight.replace(',', '.'));
    if (!barName.trim() || !(w >= 0 && w <= 100)) return setError('Give the bar a name and a weight (0–100 kg)');
    setError('');
    setBars((b) => [...b, { id: newId('bar'), name: barName.trim(), weight: w }]);
    setBarName('');
    setBarWeight('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (!trimmed) return setError('Give the gym a name');

    const program = getProgram();
    const gym = {
      id: existing?.id ?? newId('gym'),
      name: trimmed,
      lat: spot?.lat ?? null,
      lon: spot?.lon ?? null,
      radius,
      plateSource,
      plates,
      bars,
    };
    const gyms = isNew ? [...program.gyms, gym] : program.gyms.map((g) => (g.id === gym.id ? gym : g));

    setBusy(true);
    try {
      await saveProgram({ ...program, gyms });
      if (usedHere) markAtGym(gym.id, trimmed);
      navigate('/settings/places', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Remove ${existing.name}?`,
      message: 'Your indoor workouts stay. Past workouts at this gym stay in History.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    const program = getProgram();
    try {
      await saveProgram({ ...program, gyms: program.gyms.filter((g) => g.id !== existing.id) });
      navigate('/settings/places', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="screen">
      <NavBar backLabel="Indoor gyms" backTo="/settings/places" />
      <LargeTitle title={isNew ? 'New indoor gym' : existing.name} />

      <form onSubmit={handleSave} noValidate>
        <InsetGroup>
          <label className="form-row">
            <span className="form-label">Name</span>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. City gym"
              maxLength={40}
              autoCapitalize="words"
            />
          </label>
        </InsetGroup>

        {/* ── Plates ─────────────────────────────────────────── */}
        <InsetGroup header="Plates" padded>
          <SegmentedControl label="Plates" options={PLATE_SOURCE_OPTIONS} value={plateSource} onChange={setPlateSource} />
        </InsetGroup>
        {plateSource === 'gym' ? (
          <section className="inset-group">
            <h2 className="inset-group-header">Plates at this gym</h2>
            <PlateListEditor plates={plates} onChange={setPlates} />
            <p className="inset-group-footer">Pairs = one plate for each side of the bar.</p>
          </section>
        ) : (
          <InsetGroup footer="Your own set is used here. You set it up once, for all gyms.">
            <ListRow onClick={() => navigate('/settings/plates')} chevron>
              <div className="row-title">My own plates</div>
              <div className="row-meta">
                {ownPlates().length
                  ? ownPlates()
                      .slice()
                      .sort((a, b) => b.weight - a.weight)
                      .map((p) => `${formatWeight(p.weight)}×${p.pairs}`)
                      .join(' · ')
                  : 'Not set up yet'}
              </div>
            </ListRow>
          </InsetGroup>
        )}

        {/* ── Bars ───────────────────────────────────────────── */}
        <section className="inset-group">
          <h2 className="inset-group-header">Bars</h2>
          <div className="inset-group-body">
            {bars.map((b) => (
              <div key={b.id} className="list-row slot-row">
                <span className="list-row-content">
                  <span className="row-title">{b.name}</span>
                  <span className="row-meta" style={{ display: 'block' }}>
                    {formatWeight(b.weight)} kg
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${b.name}`}
                  onClick={() => setBars((list) => list.filter((x) => x.id !== b.id))}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
                </button>
              </div>
            ))}
            <div className="form-row bar-add">
              <input
                className="form-input"
                value={barName}
                onChange={(e) => setBarName(e.target.value)}
                placeholder="Bar name, e.g. EZ bar"
                maxLength={30}
                aria-label="New bar name"
                onKeyDown={(e) => e.key === 'Enter' && addBar(e)}
              />
              <input
                className="form-input bar-add-weight"
                value={barWeight}
                onChange={(e) => setBarWeight(e.target.value)}
                inputMode="decimal"
                placeholder="kg"
                aria-label="New bar weight in kg"
                onKeyDown={(e) => e.key === 'Enter' && addBar(e)}
              />
              <button type="button" className="form-toggle" onClick={addBar} disabled={!barName.trim() || !barWeight.trim()}>
                Add
              </button>
            </div>
          </div>
          <p className="inset-group-footer">In a barbell exercise you pick the bar; the app remembers it per exercise.</p>
        </section>

        {/* ── Location (optional) ────────────────────────────── */}
        <InsetGroup
          header="Location"
          footer={
            usedHere
              ? `Saved this spot${accuracy ? ` (accurate to about ${accuracy} m)` : ''}.`
              : spot
                ? 'Used to recognise this gym when you open the app.'
                : mode === 'both'
                  ? 'Needed so the app can tell when you are here. Do this while you are at the gym.'
                  : 'Optional — lets the app pick this gym automatically if you use several.'
          }
        >
          <ListRow onClick={locating ? undefined : useCurrentLocation}>
            <div className="row-action">
              {locating ? 'Finding your location…' : spot ? '⦿ Update to my current location' : '⦿ Use my current location'}
            </div>
          </ListRow>
          {spot && (
            <ListRow onClick={() => setSpot(null)}>
              <div className="row-action">Remove location</div>
            </ListRow>
          )}
        </InsetGroup>

        {spot && (
          <InsetGroup header="Recognise within" footer="Indoors GPS is rough — 200 m works for most gyms." padded>
            <SegmentedControl label="Detection radius" options={RADIUS_OPTIONS} value={radius} onChange={setRadius} />
          </InsetGroup>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="button-primary" type="submit" disabled={busy || locating || !name.trim()}>
          {busy ? 'Saving…' : isNew ? 'Add gym' : 'Save'}
        </button>
      </form>

      {!isNew && (
        <div className="editor-danger">
          <InsetGroup>
            <ListRow onClick={handleDelete}>
              <div className="row-action">Remove gym</div>
            </ListRow>
          </InsetGroup>
        </div>
      )}
    </main>
  );
}
