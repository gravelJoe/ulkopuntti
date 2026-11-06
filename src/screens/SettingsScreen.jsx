import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { InsetGroup, LargeTitle, ListRow, NavBar, SegmentedControl } from '../components/ui.jsx';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen({ theme, setTheme }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user, logout } = useAuth();

  async function handleLogout() {
    const ok = await confirm({
      title: 'Log out?',
      message: 'Your history stays saved in your account.',
      confirmLabel: 'Log out',
    });
    if (ok) logout(); // the app then shows the welcome screen
  }

  return (
    <main className="screen">
      <NavBar backLabel="Puntti" />
      <LargeTitle title="Settings" />

      {user ? (
        <InsetGroup header="Account">
          <ListRow>
            <div className="row-subtitle">Logged in as</div>
            <div className="row-title">{user.username}</div>
          </ListRow>
          <ListRow onClick={() => navigate('/account/password')} chevron>
            <div className="row-title">Change password</div>
          </ListRow>
          <ListRow onClick={handleLogout}>
            <div className="row-action">Log out</div>
          </ListRow>
        </InsetGroup>
      ) : (
        <InsetGroup header="Account" footer="As a guest, workouts aren't saved.">
          <ListRow onClick={() => navigate('/welcome', { state: { returnTo: '/settings' } })} chevron>
            <div className="row-subtitle">Guest mode</div>
            <div className="row-action">Log in</div>
          </ListRow>
        </InsetGroup>
      )}

      <InsetGroup header="Appearance" padded>
        <SegmentedControl label="Appearance" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      </InsetGroup>
    </main>
  );
}
