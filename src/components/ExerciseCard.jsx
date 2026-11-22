import { DEFAULT_WEIGHT } from '../config/workouts.js';
import { exerciseName, exerciseStep, isBarbell, platesAt } from '../program/store.js';
import { formatWeight } from '../utils/format.js';
import { SegmentedControl } from './ui.jsx';
import WeightStepper from './WeightStepper.jsx';
import BarbellHelper from './BarbellHelper.jsx';

const RESULTS = [
  { value: 'success', label: 'Go up' },
  { value: 'neutral', label: 'Repeat' },
  { value: 'fail', label: 'Go down' },
];

/** "Plan 41 kg → 42.5 kg here · Went up last time" (null when there is no plan). */
function planLine(slot, exerciseId) {
  if (slot.noPlanOffline) return 'No plan offline';
  const plan = slot.plan?.[exerciseId];
  if (!plan) return null;
  const target =
    plan.planned === plan.rounded
      ? `Plan ${formatWeight(plan.planned)} kg`
      : `Plan ${formatWeight(plan.planned)} kg → ${formatWeight(plan.rounded)} kg here`;
  return [target, plan.reason, plan.cantLoadMore && "Can't load more here", plan.offline && 'offline']
    .filter(Boolean)
    .join(' · ');
}

/**
 * One exercise: a single weight and a row of set buttons.
 * currentIndex: index of the "up next" set in this card, or -1.
 * gym: the indoor gym for barbell exercises (null outdoors / not known yet).
 * progressive: indoor session of a logged-in user — show the plan and the result buttons.
 */
export default function ExerciseCard({ slot, slotIndex, currentIndex, dispatch, onToggleSet, cardRef, indoor, gym, progressive }) {
  const exerciseId = slot.selected;
  const name = exerciseName(exerciseId);
  const weight = slot.weight[exerciseId];
  const sets = slot.sets[exerciseId];
  const last = slot.lastWeight[exerciseId];
  const doneCount = sets.filter(Boolean).length;
  const allDone = doneCount === sets.length;
  const plan = progressive ? planLine(slot, exerciseId) : null;
  const outcome = slot.outcome?.[exerciseId] ?? null;

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
      {plan && <p className="exercise-plan">{plan}</p>}

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

      {indoor && isBarbell(exerciseId) && (
        <BarbellHelper
          weight={weight}
          gym={gym}
          plates={platesAt(gym)}
          barId={slot.bar?.[exerciseId] ?? null}
          onBar={(barId) => dispatch({ type: 'setBar', slot: slotIndex, barId })}
          onWeight={(w) => dispatch({ type: 'setWeight', slot: slotIndex, weight: w })}
        />
      )}

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

      {progressive && (
        <div className="exercise-result">
          <SegmentedControl
            label={`${name} result`}
            options={RESULTS}
            value={outcome}
            onChange={(value) => dispatch({ type: 'setOutcome', slot: slotIndex, outcome: value })}
          />
        </div>
      )}
    </section>
  );
}
