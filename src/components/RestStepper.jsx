import { getRestSeconds, REST_MAX_SECONDS, REST_MIN_SECONDS, REST_STEP_SECONDS } from '../data/preferences.js';
import { formatSeconds } from '../utils/format.js';

const clamp = (s) => Math.min(REST_MAX_SECONDS, Math.max(REST_MIN_SECONDS, s));

/**
 * − / + stepper for a rest length, shared by Settings (the global rest length)
 * and the exercise edit screen (an exercise's own rest).
 *
 * label: names the control for screen readers ("Default timer", "Rest").
 * value: seconds, or null for "use the default" (shown as emptyLabel, muted).
 *   From null, − and + start from the phone's global rest length.
 * onChange(seconds): always within REST_MIN_SECONDS..REST_MAX_SECONDS.
 * There is no reset link here: each screen puts its own in its group footer.
 */
export default function RestStepper({ label, value, onChange, emptyLabel }) {
  const isDefault = value === null || value === undefined;
  const from = isDefault ? getRestSeconds() : value;

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        aria-label={`${label}: ${REST_STEP_SECONDS} seconds shorter`}
        disabled={!isDefault && value <= REST_MIN_SECONDS}
        onClick={() => onChange(clamp(from - REST_STEP_SECONDS))}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14" /></svg>
      </button>
      {isDefault ? (
        <div className="stepper-value is-default" aria-live="polite" aria-label={`${label}: ${emptyLabel}`}>
          {emptyLabel}
        </div>
      ) : (
        <div className="stepper-value" aria-live="polite" aria-label={`${label} ${formatSeconds(value)}`}>
          {formatSeconds(value)}
          <span className="stepper-unit">min</span>
        </div>
      )}
      <button
        type="button"
        className="stepper-btn"
        aria-label={`${label}: ${REST_STEP_SECONDS} seconds longer`}
        disabled={!isDefault && value >= REST_MAX_SECONDS}
        onClick={() => onChange(clamp(from + REST_STEP_SECONDS))}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14M10 3v14" /></svg>
      </button>
    </div>
  );
}
