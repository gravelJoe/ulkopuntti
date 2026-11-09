import { useLayoutEffect, useRef, useState } from 'react';
import { WEIGHT_STEP } from '../config/workouts.js';
import { clampWeight } from '../workout/session.js';
import { formatWeight } from '../utils/format.js';

/** [ − ]  62.5 kg  [ + ]  — tap the number to type an exact value. */
export default function WeightStepper({ value, onChange, label, step = WEIGHT_STEP }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  // Focus synchronously after the tap so iOS opens the keyboard.
  useLayoutEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    setText(formatWeight(value));
    setEditing(true);
  }

  function commit() {
    const n = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(n)) onChange(clampWeight(n));
    setEditing(false);
  }

  return (
    <div className="stepper">
      <button
        className="stepper-btn"
        aria-label={`${label}: decrease`}
        disabled={value <= 0}
        onClick={() => onChange(clampWeight(value - step))}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14" /></svg>
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className="stepper-input"
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          aria-label={`${label} in kg`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <button className="stepper-value" aria-label={`${label}: ${formatWeight(value)} kg, tap to type`} onClick={startEdit}>
          {formatWeight(value)}
          <span className="stepper-unit">kg</span>
        </button>
      )}

      <button
        className="stepper-btn"
        aria-label={`${label}: increase`}
        onClick={() => onChange(clampWeight(value + step))}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14M10 3v14" /></svg>
      </button>
    </div>
  );
}
