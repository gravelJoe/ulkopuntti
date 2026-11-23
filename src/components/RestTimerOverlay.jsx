import { REST_EXTEND_SECONDS, REST_FAST_FORWARD_SECONDS } from '../config/workouts.js';
import { formatSeconds, formatWeight } from '../utils/format.js';

const LATE_MS = 5000; // the end was noticed this late: the page was paused

const clock = (ms) => formatSeconds(Math.ceil(ms / 1000));

/**
 * Full-screen rest countdown, readable at arm's length.
 * timer.info: { justDone: 'Squat · Set 2 of 5 done', next: { name, set, weight } | null }
 * playing: the alarm tune is playing (the button reads "Stop alarm").
 * endedAgoMs: how late the end was noticed; over 5 s shows "Rest ended m:ss ago".
 * onSkip closes the overlay; when finished, a tap anywhere does too (and stops the tune).
 */
export default function RestTimerOverlay({ timer, remainingMs, playing, endedAgoMs, onFastForward, onExtend, onSkip }) {
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
        <p className="rest-label">
          {!finished ? 'Rest' : endedAgoMs > LATE_MS ? `Rest ended ${clock(endedAgoMs)} ago` : 'Rest over'}
        </p>
        <p className="rest-done">{info.justDone}</p>
      </div>

      <div className="rest-center">
        <div className="rest-digits" aria-live={finished ? 'assertive' : 'off'}>
          {finished ? 'Go!' : clock(remainingMs)}
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
            {playing ? 'Stop alarm' : 'Back to workout'}
          </button>
        ) : (
          <>
            <div className="rest-adjust">
              <button className="button-secondary rest-btn" onClick={() => onFastForward(REST_FAST_FORWARD_SECONDS)}>
                −{REST_FAST_FORWARD_SECONDS} s
              </button>
              <button className="button-secondary rest-btn" onClick={() => onExtend(REST_EXTEND_SECONDS)}>
                +{REST_EXTEND_SECONDS} s
              </button>
            </div>
            <button className="button-primary rest-btn" onClick={onSkip}>
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}
