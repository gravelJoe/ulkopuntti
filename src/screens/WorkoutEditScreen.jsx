import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  activeWorkouts,
  PLACES,
  trainingMode,
  workoutPlace,
  getProgram,
  getWorkout,
  newId,
  saveProgram,
  slotLabel,
  useProgram,
  weekdayName,
  WEEKDAYS,
} from '../program/store.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import ExercisePicker from '../components/ExercisePicker.jsx';
import { InsetGroup, LargeTitle, ListRow, NavBar, SegmentedControl } from '../components/ui.jsx';

const autoBadge = (name) => {
  const s = name.trim();
  return s ? s.slice(0, 2).charAt(0).toUpperCase() + s.slice(1, 2).toLowerCase() : '';
};

export default function WorkoutEditScreen() {
  const { editId } = useParams();
  const isNew = editId === 'new';
  const placeFromList = useLocation().state?.place;
  const existing = isNew ? null : getWorkout(editId);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  useProgram();

  const [name, setName] = useState(existing?.name ?? '');
  const [badge, setBadge] = useState(existing?.badge ?? '');
  const [badgeEdited, setBadgeEdited] = useState(!isNew);
  const mode = trainingMode();
  const [place, setPlace] = useState(
    existing ? workoutPlace(existing) : mode !== 'both' ? mode : placeFromList === 'indoor' ? 'indoor' : 'outdoor',
  );
  const [weekday, setWeekday] = useState(existing?.weekday ?? null);
  const [slots, setSlots] = useState(existing?.slots ?? []);
  const [picker, setPicker] = useState(null); // { index } — index = slots.length for a new slot
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/settings" replace />;
  if (!isNew && (!existing || existing.archived)) return <Navigate to="/settings/workouts" replace />;

  const shownBadge = badgeEdited ? badge : autoBadge(name);
  const dayOwner =
    weekday === null
      ? null
      : activeWorkouts().find((w) => w.weekday === weekday && workoutPlace(w) === place && w.id !== existing?.id);

  function move(index, delta) {
    setSlots((s) => {
      const next = [...s];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  }

  function removeSlot(index) {
    setSlots((s) => s.filter((_, i) => i !== index));
  }

  function handlePicked(ids) {
    setSlots((s) => {
      const next = [...s];
      next[picker.index] = { options: ids };
      return next;
    });
    setPicker(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (!trimmed) return setError('Give the workout a name');
    if (!shownBadge.trim()) return setError('Give the workout a badge (1–3 letters)');
    if (slots.length === 0) return setError('Add at least one exercise');

    const program = getProgram();
    const workout = {
      id: existing?.id ?? newId('w'),
      name: trimmed,
      badge: shownBadge.trim(),
      place,
      weekday,
      slots,
    };
    // One workout per day: the previous owner of this day loses it.
    const others = program.workouts.map((w) =>
      w.id !== workout.id && weekday !== null && w.weekday === weekday && workoutPlace(w) === place
        ? { ...w, weekday: null }
        : w,
    );
    const workouts = isNew ? [...others, workout] : others.map((w) => (w.id === workout.id ? { ...w, ...workout } : w));

    setBusy(true);
    try {
      await saveProgram({ ...program, workouts });
      navigate('/settings/workouts', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${existing.name}?`,
      message: 'Past workouts stay in History.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const program = getProgram();
    const workouts = program.workouts.map((w) => (w.id === existing.id ? { ...w, archived: true, weekday: null } : w));
    try {
      await saveProgram({ ...program, workouts });
      navigate('/settings/workouts', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (picker) {
    return (
      <ExercisePicker
        title={picker.index < slots.length ? 'Change exercise' : 'Add exercise'}
        current={slots[picker.index]?.options.length === 1 ? slots[picker.index].options[0] : null}
        place={place}
        onDone={handlePicked}
        onCancel={() => setPicker(null)}
      />
    );
  }

  return (
    <main className="screen">
      <NavBar backLabel="Workouts" backTo="/settings/workouts" />
      <LargeTitle title={isNew ? 'New workout' : existing.name} />

      <form onSubmit={handleSave} noValidate>
        <InsetGroup>
          <label className="form-row">
            <span className="form-label">Name</span>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Saturday"
              maxLength={40}
              autoCapitalize="words"
            />
          </label>
          <label className="form-row">
            <span className="form-label">Badge</span>
            <input
              className="form-input"
              value={shownBadge}
              onChange={(e) => {
                setBadgeEdited(true);
                setBadge(e.target.value);
              }}
              placeholder="1–3 letters"
              maxLength={3}
            />
            {shownBadge.trim() && <span className="workout-badge is-small">{shownBadge.trim()}</span>}
          </label>
        </InsetGroup>

        {mode === 'both' && (
          <InsetGroup
            header="Place"
            footer={place === 'indoor' ? 'Shown when you are at any of your indoor gyms.' : 'Shown when you train outdoors.'}
            padded
          >
            <SegmentedControl
              label="Place"
              options={PLACES}
              value={place}
              onChange={async (p) => {
                if (p === place) return;
                if (slots.length) {
                  const ok = await confirm({
                    title: `Make this an ${p} workout?`,
                    message: 'Indoor and outdoor exercises are separate, so the exercise list will be cleared.',
                    confirmLabel: 'Change',
                  });
                  if (!ok) return;
                  setSlots([]);
                }
                setPlace(p);
              }}
            />
          </InsetGroup>
        )}

        <InsetGroup
          header="Day"
          footer={
            weekday === null
              ? 'No day: start it from Home whenever you like.'
              : dayOwner
                ? `${weekdayName(weekday)} (${place}) is now used by ${dayOwner.name}. Saving moves it here.`
                : `Opens automatically every ${weekdayName(weekday)}.`
          }
          padded
        >
          <div className="day-chips" role="group" aria-label="Day of the week">
            {WEEKDAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                className="day-chip"
                aria-pressed={weekday === d.value}
                aria-label={d.name}
                onClick={() => setWeekday((v) => (v === d.value ? null : d.value))}
              >
                {d.short}
              </button>
            ))}
          </div>
        </InsetGroup>

        <InsetGroup header="Exercises, in order">
          {slots.map((slot, i) => (
            <div key={`${i}-${slot.options.join()}`} className="list-row slot-row">
              <button type="button" className="slot-main" onClick={() => setPicker({ index: i })}>
                <span className="row-title">{slotLabel(slot)}</span>
                {slot.options.length > 1 && <span className="row-meta">Choose on the day</span>}
              </button>
              <button type="button" className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 12 5-5 5 5" /></svg>
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Move down"
                disabled={i === slots.length - 1}
                onClick={() => move(i, 1)}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5" /></svg>
              </button>
              <button type="button" className="icon-btn" aria-label="Remove" onClick={() => removeSlot(i)}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
              </button>
            </div>
          ))}
          <ListRow onClick={() => setPicker({ index: slots.length })}>
            <div className="row-action">+ Add exercise</div>
          </ListRow>
        </InsetGroup>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="button-primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : isNew ? 'Add workout' : 'Save'}
        </button>
      </form>

      {!isNew && (
        <div className="editor-danger">
          <InsetGroup>
            <ListRow onClick={handleDelete}>
              <div className="row-action">Delete workout</div>
            </ListRow>
          </InsetGroup>
        </div>
      )}
    </main>
  );
}
