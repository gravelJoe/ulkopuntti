import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkout, slotSummary, workouts } from '../config/workouts.js';
import { clearDraft, getLastSessionDates, loadDraft } from '../data/repository.js';
import { useAuth } from '../hooks/useAuth.js';
import { progress } from '../workout/session.js';
import { formatRelativeDate, formatTime } from '../utils/format.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { InsetGroup, LargeTitle, ListRow, SegmentedControl } from '../components/ui.jsx';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function HomeScreen({ theme, setTheme }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user, logout } = useAuth();
  const [lastDates, setLastDates] = useState({});
  const [draft, setDraft] = useState(null);

  // Reload when the account changes (log in / log out switch data).
  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await loadDraft();
      if (!alive) return;
      // Only offer to resume if something was actually done.
      setDraft(d && getWorkout(d.workoutId) && progress(d).done > 0 ? d : null);
      const dates = await getLastSessionDates().catch(() => ({}));
      if (alive) setLastDates(dates);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const draftProgress = draft ? progress(draft) : null;
  const draftWorkout = draft ? getWorkout(draft.workoutId) : null;

  async function startWorkout(id) {
    if (draft && draft.workoutId !== id) {
      const ok = await confirm({
        title: `Discard ${draftWorkout.name}?`,
        message: `You have ${draftProgress.done} sets done in a workout that isn't finished. Starting a new one discards it.`,
        confirmLabel: 'Discard',
        destructive: true,
      });
      if (!ok) return;
      await clearDraft();
    }
    navigate(`/workout/${id}`);
  }

  async function discardDraft() {
    const ok = await confirm({
      title: `Discard ${draftWorkout.name}?`,
      message: "The workout in progress won't be saved.",
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (!ok) return;
    await clearDraft();
    setDraft(null);
  }

  async function handleLogout() {
    const ok = await confirm({
      title: 'Log out?',
      message: 'Your history stays saved in your account.',
      confirmLabel: 'Log out',
    });
    if (ok) logout();
  }

  return (
    <main className="screen">
      <LargeTitle title="Puntti" />

      {draft && (
        <InsetGroup header="In progress">
          <ListRow
            className="workout-row"
            onClick={() => navigate(`/workout/${draft.workoutId}`)}
            leading={<span className="workout-badge">{draft.workoutId}</span>}
            chevron
          >
            <div className="row-title">Resume {draftWorkout.name}</div>
            <div className="row-subtitle">
              {draftProgress.done} of {draftProgress.total} sets done
            </div>
            <div className="row-meta">Started {formatTime(draft.startedAt)}</div>
          </ListRow>
          <ListRow onClick={discardDraft}>
            <div className="row-action">Discard workout</div>
          </ListRow>
        </InsetGroup>
      )}

      <InsetGroup header={draft ? 'Start new' : 'Start workout'}>
        {workouts.map((w) => (
          <ListRow
            key={w.id}
            className="workout-row"
            onClick={() => startWorkout(w.id)}
            leading={<span className={`workout-badge${draft ? ' is-muted' : ''}`}>{w.id}</span>}
            chevron
          >
            <div className="row-title">{w.name}</div>
            <div className="row-subtitle">{slotSummary(w)}</div>
            {user && (
              <div className="row-meta">
                {lastDates[w.id] ? `Last: ${formatRelativeDate(lastDates[w.id])}` : 'Not done yet'}
              </div>
            )}
          </ListRow>
        ))}
      </InsetGroup>

      <InsetGroup>
        <ListRow onClick={() => navigate('/history')} chevron>
          <div className="row-title">History</div>
        </ListRow>
      </InsetGroup>

      {user ? (
        <InsetGroup header="Account">
          <ListRow>
            <div className="row-subtitle">Logged in as</div>
            <div className="row-title">{user.username}</div>
          </ListRow>
          <ListRow onClick={handleLogout}>
            <div className="row-action">Log out</div>
          </ListRow>
        </InsetGroup>
      ) : (
        <InsetGroup header="Account" footer="As a guest, workouts aren't saved.">
          <ListRow onClick={() => navigate('/welcome')} chevron>
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
