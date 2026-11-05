import { REST_FAST_FORWARD_SECONDS } from '../config/workouts.js';
import { formatWeight } from '../utils/format.js';

function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Full-screen rest countdown, readable at arm's length.
 * timer.info: { justDone: 'Squat · Set 2 of 5 done', next: { name, set, weight } | null }
 */
export default function RestTimerOverlay({ timer, remainingMs, onFastForward, onSkip }) {
  if (!timer) return null;
  const { info, finished, durationMs } = timer;
  const fraction = finished ? 0 : remainingMs / durationMs;

  return (
    <div
      className={`rest-overlay${finished ? ' is-finished' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Rest timer"
      onClick={finished ? onSkip : undefined}
    >
      <div className="rest-top">
        <p className="rest-label">{finished ? 'Rest over' : 'Rest'}</p>
        <p className="rest-done">{info.justDone}</p>
      </div>

      <div className="rest-center">
        <div className="rest-digits" aria-live={finished ? 'assertive' : 'off'}>
          {finished ? 'Go!' : formatClock(remainingMs)}
        </div>
        <div className="rest-bar" aria-hidden="true">
          <div className="rest-bar-fill" style={{ transform: `scaleX(${fraction})` }} />
        </div>
        {info.next && (
          <p className="rest-next">
            Next: <strong>{info.next.name}</strong> · Set {info.next.set} · {formatWeight(info.next.weight)} kg
          </p>
        )}
      </div>

      <div className="rest-actions">
        {finished ? (
          <button className="button-primary rest-btn" onClick={onSkip}>
            Back to workout
          </button>
        ) : (
          <>
            <button className="button-secondary rest-btn" onClick={() => onFastForward(REST_FAST_FORWARD_SECONDS)}>
              −{REST_FAST_FORWARD_SECONDS} s
            </button>
            <button className="button-primary rest-btn" onClick={onSkip}>
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}
