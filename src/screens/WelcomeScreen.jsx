import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

// First screen: log in, or continue as a guest. Always dark (photo mood),
// whatever the app theme is.
export default function WelcomeScreen() {
  const navigate = useNavigate();
  const returnTo = useLocation().state?.returnTo ?? '/';
  const { user, login, continueAsGuest } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && !busy) return <Navigate to={returnTo} replace />;

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function handleGuest() {
    continueAsGuest();
    navigate(returnTo, { replace: true });
  }

  return (
    <main className="welcome">
      <div className="welcome-inner">
        <header className="welcome-brand">
          <h1 className="welcome-title">Puntti</h1>
          <p className="welcome-tagline">Outdoor gym log</p>
        </header>

        <form className="welcome-form" onSubmit={handleLogin} noValidate>
          <label className="sr-only" htmlFor="welcome-username">
            Username
          </label>
          <input
            id="welcome-username"
            className="welcome-field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
          />

          <div className="welcome-password">
            <label className="sr-only" htmlFor="welcome-password">
              Password
            </label>
            <input
              id="welcome-password"
              className="welcome-field"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              enterKeyHint="go"
            />
            <button
              type="button"
              className="welcome-show"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && (
            <p className="welcome-error" role="alert">
              {error}
            </p>
          )}

          <button className="button-primary" type="submit" disabled={busy || !username.trim() || !password}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
          <button className="welcome-guest" type="button" onClick={handleGuest}>
            Continue as guest
          </button>
          <p className="welcome-note">As a guest you can log workouts, but they aren't saved.</p>
        </form>
      </div>
    </main>
  );
}
