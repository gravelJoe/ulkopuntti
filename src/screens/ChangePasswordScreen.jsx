import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { InsetGroup, LargeTitle, NavBar } from '../components/ui.jsx';

const MIN_PASSWORD = 8;

export default function ChangePasswordScreen() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user, changePassword } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/" replace />;

  const type = show ? 'text' : 'password';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (next.length < MIN_PASSWORD) return setError(`New password must be at least ${MIN_PASSWORD} characters`);
    if (next !== repeat) return setError("New passwords don't match");

    setBusy(true);
    try {
      await changePassword(current, next);
      await confirm({
        title: 'Password changed',
        message: 'Use your new password next time you log in.',
        confirmLabel: 'OK',
        cancelLabel: null,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <NavBar backLabel="Puntti" />
      <LargeTitle title="Change password" subtitle={`Account: ${user.username}`} />

      <form onSubmit={handleSubmit} noValidate>
        {/* Lets password managers know which account this is for. */}
        <input type="text" name="username" autoComplete="username" value={user.username} readOnly hidden />

        <InsetGroup header="Current">
          <label className="form-row">
            <span className="form-label">Password</span>
            <input
              className="form-input"
              type={type}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              placeholder="current password"
            />
          </label>
        </InsetGroup>

        <InsetGroup header="New" footer={`At least ${MIN_PASSWORD} characters.`}>
          <label className="form-row">
            <span className="form-label">New</span>
            <input
              className="form-input"
              type={type}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="new password"
            />
          </label>
          <label className="form-row">
            <span className="form-label">Repeat</span>
            <input
              className="form-input"
              type={type}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              autoComplete="new-password"
              enterKeyHint="done"
              placeholder="new password again"
            />
          </label>
        </InsetGroup>

        <button type="button" className="form-toggle form-toggle-block" aria-pressed={show} onClick={() => setShow((v) => !v)}>
          {show ? 'Hide passwords' : 'Show passwords'}
        </button>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="button-primary" type="submit" disabled={busy || !current || !next || !repeat}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </main>
  );
}
