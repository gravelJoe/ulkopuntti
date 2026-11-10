import { useState } from 'react';
import { isValidPlateWeight, plateColor, STANDARD_PLATES } from '../utils/plates.js';
import { formatWeight } from '../utils/format.js';

/**
 * Edit a plate set: [{ weight, pairs }] (1 pair = one plate per side).
 * Controlled: `plates` + `onChange(next)`.
 */
export default function PlateListEditor({ plates, onChange }) {
  const [newWeight, setNewWeight] = useState('');
  const [error, setError] = useState('');
  const sorted = plates.slice().sort((a, b) => b.weight - a.weight);

  function setPairs(weight, pairs) {
    onChange(plates.map((p) => (p.weight === weight ? { ...p, pairs: Math.max(0, Math.min(30, pairs)) } : p)));
  }

  function add() {
    setError('');
    const w = parseFloat(newWeight.replace(',', '.'));
    if (!isValidPlateWeight(w)) return setError('Enter a plate weight between 0.05 and 50 kg');
    if (plates.some((p) => p.weight === w)) return setError(`${formatWeight(w)} kg is already in the list`);
    onChange([...plates, { weight: w, pairs: 1 }]);
    setNewWeight('');
  }

  return (
    <>
      <div className="inset-group-body">
        {sorted.length === 0 && (
          <button type="button" className="list-row" onClick={() => onChange(STANDARD_PLATES.map((p) => ({ ...p })))}>
            <span className="list-row-content">
              <span className="row-action">Fill in a standard set</span>
              <span className="row-meta" style={{ display: 'block' }}>
                25, 20, 15, 10, 5, 2.5, 1.25 kg — then adjust
              </span>
            </span>
          </button>
        )}
        {sorted.map((p) => (
          <div key={p.weight} className="list-row plate-row">
            <span
              className="plate plate-s"
              style={{ background: plateColor(p.weight), color: p.weight >= 5 && p.weight < 10 ? '#000' : '#fff' }}
              aria-hidden="true"
            />
            <span className="row-title plate-row-weight">{formatWeight(p.weight)} kg</span>
            <span className="mini-stepper">
              <button type="button" className="icon-btn" aria-label={`Fewer ${p.weight} kg pairs`} disabled={p.pairs <= 0} onClick={() => setPairs(p.weight, p.pairs - 1)}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10" /></svg>
              </button>
              <span className="mini-stepper-value">
                {p.pairs}
                <span className="mini-stepper-unit">{p.pairs === 1 ? 'pair' : 'pairs'}</span>
              </span>
              <button type="button" className="icon-btn" aria-label={`More ${p.weight} kg pairs`} onClick={() => setPairs(p.weight, p.pairs + 1)}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M10 5v10" /></svg>
              </button>
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${p.weight} kg`}
              onClick={() => onChange(plates.filter((x) => x.weight !== p.weight))}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
            </button>
          </div>
        ))}
        {/* Not a <form>: this sits inside other forms (e.g. the gym editor). */}
        <div className="form-row">
          <input
            className="form-input"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            inputMode="decimal"
            placeholder="Add a plate size, e.g. 1"
            aria-label="New plate size in kg"
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" className="form-toggle" onClick={add} disabled={!newWeight.trim()}>
            Add
          </button>
        </div>
      </div>
      {error && (
        <p className="form-error form-error-inline" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
