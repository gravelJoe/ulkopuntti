import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { SETS_PER_EXERCISE, WEIGHT_STEP } from '../config/workouts.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  activeExercisesAt,
  activeWorkouts,
  getExercise,
  getProgram,
  newId,
  PLACES,
  saveProgram,
  trainingMode,
} from '../program/store.js';
import { formatWeight } from '../utils/format.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { InsetGroup, LargeTitle, ListRow, NavBar, SegmentedControl } from '../components/ui.jsx';

const STEP_CHOICES = { machine: [1.25, 2.5, 5, 10], barbell: [0.5, 1, 2.5, 5] };
const DEFAULT_STEP = { machine: WEIGHT_STEP, barbell: 1 };
const KIND_OPTIONS = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'machine', label: 'Machine' },
];
const MIN_SETS = 1;
const MAX_SETS = 10;

export default function ExerciseEditScreen() {
  const { exerciseId } = useParams();
  const isNew = exerciseId === 'new';
  const existing = isNew ? null : getExercise(exerciseId);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const mode = trainingMode();
  const placeFromList = useLocation().state?.place;

  const [place, setPlace] = useState(
    existing?.place ?? (mode !== 'both' ? mode : placeFromList === 'indoor' ? 'indoor' : 'outdoor'),
  );
  const [kind, setKind] = useState(existing?.kind ?? (place === 'indoor' ? 'barbell' : 'machine'));
  const [name, setName] = useState(existing?.name ?? '');
  const [sets, setSets] = useState(existing?.sets ?? SETS_PER_EXERCISE);
  const [step, setStep] = useState(existing?.step ?? DEFAULT_STEP[existing?.kind ?? kind]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/settings" replace />;
  if (!isNew && (!existing || existing.archived)) return <Navigate to="/settings/exercises" replace />;

  const effectiveKind = place === 'indoor' ? kind : 'machine';
  const choices = STEP_CHOICES[effectiveKind];
  const stepOptions = (choices.includes(step) ? choices : [...choices, step].sort((a, b) => a - b)).map(
    (v) => ({ value: v, label: `${formatWeight(v)}` }),
  );
  const usedIn = existing ? activeWorkouts().filter((w) => w.slots.some((s) => s.options.includes(existing.id))) : [];

  async function handleSave(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Give the exercise a name');
    const clash = activeExercisesAt(place).find((x) => x.id !== existing?.id && x.name.toLowerCase() === trimmed.toLowerCase());
    if (clash) return setError('An exercise with that name already exists');

    const program = getProgram();
    const exercise = { id: existing?.id ?? newId('ex'), name: trimmed, place, kind: effectiveKind, sets, step };
    const exercises = isNew
      ? [...program.exercises, exercise]
      : program.exercises.map((x) => (x.id === exercise.id ? { ...x, ...exercise } : x));

    setBusy(true);
    try {
      await saveProgram({ ...program, exercises });
      navigate(`/settings/exercises?place=${place}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${existing.name}?`,
      message:
        (usedIn.length ? `It will be removed from ${usedIn.map((w) => w.name).join(' and ')}. ` : '') +
        'Past results stay in History.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    const program = getProgram();
    const exercises = program.exercises.map((x) => (x.id === existing.id ? { ...x, archived: true } : x));
    const workouts = program.workouts.map((w) => ({
      ...w,
      slots: w.slots
        .map((s) => ({ options: s.options.filter((id) => id !== existing.id) }))
        .filter((s) => s.options.length > 0),
    }));
    try {
      await saveProgram({ ...program, exercises, workouts });
      navigate(`/settings/exercises?place=${place}`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="screen">
      <NavBar backLabel="Exercises" backTo={`/settings/exercises?place=${place}`} />
      <LargeTitle title={isNew ? 'New exercise' : existing.name} />

      <form onSubmit={handleSave} noValidate>
        <InsetGroup>
          <label className="form-row">
            <span className="form-label">Name</span>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deadlift"
              maxLength={40}
              autoCapitalize="words"
            />
          </label>
        </InsetGroup>

        {isNew && mode === 'both' && (
          <InsetGroup header="Place" footer="Indoor and outdoor exercises are kept separate." padded>
            <SegmentedControl
              label="Place"
              options={PLACES}
              value={place}
              onChange={(p) => {
                setPlace(p);
                const k = p === 'indoor' ? 'barbell' : 'machine';
                setKind(k);
                setStep(DEFAULT_STEP[k]);
              }}
            />
          </InsetGroup>
        )}

        {place === 'indoor' && (
          <InsetGroup
            header="Equipment"
            footer={
              kind === 'barbell'
                ? 'You set the total weight; the app shows the bar and which plates to load.'
                : 'A machine or weight stack: − and + change the weight by the step below.'
            }
            padded
          >
            <SegmentedControl
              label="Equipment"
              options={KIND_OPTIONS}
              value={kind}
              onChange={(k) => {
                setKind(k);
                setStep(DEFAULT_STEP[k]);
              }}
            />
          </InsetGroup>
        )}

        <InsetGroup header="Sets" padded>
          <div className="stepper">
            <button
              type="button"
              className="stepper-btn"
              aria-label="Fewer sets"
              disabled={sets <= MIN_SETS}
              onClick={() => setSets((n) => Math.max(MIN_SETS, n - 1))}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14" /></svg>
            </button>
            <div className="stepper-value" aria-live="polite">
              {sets}
              <span className="stepper-unit">{sets === 1 ? 'set' : 'sets'}</span>
            </div>
            <button
              type="button"
              className="stepper-btn"
              aria-label="More sets"
              disabled={sets >= MAX_SETS}
              onClick={() => setSets((n) => Math.min(MAX_SETS, n + 1))}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14M10 3v14" /></svg>
            </button>
          </div>
        </InsetGroup>

        <InsetGroup header="Weight step (kg per tap)" padded>
          <SegmentedControl label="Weight step" options={stepOptions} value={step} onChange={setStep} />
        </InsetGroup>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="button-primary" type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Saving…' : isNew ? 'Add exercise' : 'Save'}
        </button>
      </form>

      {!isNew && (
        <div className="editor-danger">
          <InsetGroup footer={usedIn.length ? `Used in ${usedIn.map((w) => w.name).join(', ')}.` : null}>
            <ListRow onClick={handleDelete}>
              <div className="row-action">Delete exercise</div>
            </ListRow>
          </InsetGroup>
        </div>
      )}
    </main>
  );
}
