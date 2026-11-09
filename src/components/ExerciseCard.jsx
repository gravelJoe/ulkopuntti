import { DEFAULT_WEIGHT } from '../config/workouts.js';
import { exerciseName, exerciseStep } from '../program/store.js';
import { formatWeight } from '../utils/format.js';
import { SegmentedControl } from './ui.jsx';
import WeightStepper from './WeightStepper.jsx';

/**
 * One exercise: a single weight and a row of set buttons.
 * currentIndex: index of the "up next" set in this card, or -1.
 */
export default function ExerciseCard({ slot, slotIndex, currentIndex, dispatch, onToggleSet, cardRef }) {
  const exerciseId = slot.selected;
  const name = exerciseName(exerciseId);
  const weight = slot.weight[exerciseId];
  const sets = slot.sets[exerciseId];
  const last = slot.lastWeight[exerciseId];
  const doneCount = sets.filter(Boolean).length;
  const allDone = doneCount === sets.length;

  return (
    <section className="exercise-card" ref={cardRef}>
      <header className="exercise-head">
        <h2 className="exercise-name">{name}</h2>
        <span className={`exercise-count${allDone ? ' is-complete' : ''}`}>
          {doneCount}/{sets.length}
        </span>
      </header>
      <p className="exercise-last">
        {last != null ? `Last time: ${formatWeight(last)} kg` : `First time · starting at ${DEFAULT_WEIGHT} kg`}
      </p>

      {slot.options.length > 1 && (
        <div className="exercise-choice">
          <SegmentedControl
            label="Choose exercise"
            options={slot.options.map((id) => ({ value: id, label: exerciseName(id) }))}
            value={exerciseId}
            disabled={doneCount > 0}
            onChange={(id) => dispatch({ type: 'select', slot: slotIndex, exerciseId: id })}
          />
        </div>
      )}

      <WeightStepper
        label={`${name} weight`}
        value={weight}
        step={exerciseStep(exerciseId)}
        onChange={(w) => dispatch({ type: 'setWeight', slot: slotIndex, weight: w })}
      />

      <ol className="set-buttons" aria-label={`${name} sets`}>
        {sets.map((done, i) => (
          <li key={i}>
            <button
              className={`set-button${i === currentIndex ? ' is-current' : ''}`}
              aria-pressed={done}
              aria-label={`Set ${i + 1}${done ? ', done' : ''}`}
              onClick={() => onToggleSet(i)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
