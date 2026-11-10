import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getProgram, ownPlates, saveProgram } from '../program/store.js';
import PlateListEditor from '../components/PlateListEditor.jsx';
import { LargeTitle, NavBar } from '../components/ui.jsx';

/** The user's own plate set, used at gyms set to "My own plates". */
export default function OwnPlatesScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plates, setPlates] = useState(ownPlates);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return <Navigate to="/settings" replace />;

  async function handleSave() {
    setBusy(true);
    setError('');
    try {
      await saveProgram({ ...getProgram(), ownPlates: plates });
      navigate(-1);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <NavBar backLabel="Back" onBack={() => navigate(-1)} />
      <LargeTitle title="My own plates" subtitle="Used at every gym where you choose “My own plates”." />

      <section className="inset-group">
        <h2 className="inset-group-header">Plates</h2>
        <PlateListEditor plates={plates} onChange={setPlates} />
        <p className="inset-group-footer">Pairs = one plate for each side of the bar.</p>
      </section>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button-primary" type="button" onClick={handleSave} disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </main>
  );
}
