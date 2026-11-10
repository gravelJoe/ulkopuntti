import { useState } from 'react';
import { SETS_PER_EXERCISE, WEIGHT_STEP } from '../config/workouts.js';
import { activeExercisesAt, getProgram, newId, saveProgram, useProgram } from '../program/store.js';
import { SegmentedControl } from './ui.jsx';

/**
 * Full-screen picker for one workout slot: tap an exercise to choose it.
 * A new exercise can be created here too (it's chosen right away).
 * Calls onDone([exerciseId]).
 */
export default function ExercisePicker({ current = null, title = 'Add exercise', place = 'outdoor', onDone, onCancel }) {
  useProgram();
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState('barbell'); // indoor only
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const list = activeExercisesAt(place).slice().sort((a, b) => a.name.localeCompare(b.name));

  async function createExercise(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const existing = activeExercisesAt(place).find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (existing) return onDone([existing.id]);

    const program = getProgram();
    const kind = place === 'indoor' ? newKind : 'machine';
    const exercise = { id: newId('ex'), name, place, kind, sets: SETS_PER_EXERCISE, step: kind === 'barbell' ? 1 : WEIGHT_STEP };
    setBusy(true);
    setError('');
    try {
      await saveProgram({ ...program, exercises: [...program.exercises, exercise] });
      onDone([exercise.id]);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label={title}>
      <header className="picker-bar">
        <button type="button" className="picker-bar-btn" onClick={onCancel}>
          Cancel
        </button>
        <h2 className="picker-title">{title}</h2>
        <span className="picker-bar-btn" aria-hidden="true" />
      </header>

      <div className="picker-body">
        <section className="inset-group">
          <h3 className="inset-group-header">{place === 'indoor' ? 'Indoor exercises' : 'Exercises'}</h3>
          <div className="inset-group-body">
            {list.length === 0 && <div className="list-row empty-state">None yet — add one below.</div>}
            {list.map((e) => (
              <button
                key={e.id}
                type="button"
                className="list-row picker-row"
                aria-current={e.id === current ? 'true' : undefined}
                onClick={() => onDone([e.id])}
              >
                <span className="list-row-content row-title">{e.name}</span>
                {e.id === current && (
                  <span className="picker-check is-on" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <form className="inset-group" onSubmit={createExercise}>
          <h3 className="inset-group-header">New exercise</h3>
          <div className="inset-group-body">
            <div className="form-row">
              <input
                className="form-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name, e.g. Deadlift"
                maxLength={40}
                autoCapitalize="words"
                aria-label="New exercise name"
              />
              <button type="submit" className="form-toggle" disabled={busy || !newName.trim()}>
                Add
              </button>
            </div>
          </div>
          {place === 'indoor' && (
            <div className="picker-kind">
              <SegmentedControl
                label="Equipment"
                options={[
                  { value: 'barbell', label: 'Barbell' },
                  { value: 'machine', label: 'Machine' },
                ]}
                value={newKind}
                onChange={setNewKind}
              />
            </div>
          )}
          <p className="inset-group-footer">
            New exercises get {SETS_PER_EXERCISE} sets
            {place === 'indoor' && newKind === 'barbell' ? ' and 1 kg steps' : ` and ${WEIGHT_STEP} kg steps`} — change
            them under Settings → Exercises.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
