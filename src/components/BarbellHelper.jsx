import { plateColor, solvePlates } from '../utils/plates.js';
import { formatWeight } from '../utils/format.js';

// Plates that read dark text (light colours) vs white text.
const darkText = (w) => w >= 5 && w < 10;

/** Plate drawn roughly to scale: heavier plates are taller. */
function Plate({ weight }) {
  const size = weight >= 15 ? 'xl' : weight >= 10 ? 'l' : weight >= 2.5 ? 'm' : 's';
  return (
    <span
      className={`plate plate-${size}`}
      style={{ background: plateColor(weight), color: darkText(weight) ? '#000' : '#fff' }}
    >
      {formatWeight(weight)}
    </span>
  );
}

/**
 * Indoor barbell exercises: choose the bar, see which plates to load.
 * gym: the indoor gym (bars + plates), or null if not known yet.
 */
export default function BarbellHelper({ weight, gym, plates, barId, onBar, onWeight }) {
  if (!gym) {
    return <p className="barbell-note">Choose your gym above to see the bar and plates to load.</p>;
  }

  const bars = gym.bars ?? [];
  const bar = bars.find((b) => b.id === barId) ?? bars[0] ?? null;

  if (!bar) {
    return <p className="barbell-note">Add the bars at {gym.name} in Settings → Indoor gyms to see how to load this.</p>;
  }

  const result = solvePlates(weight, bar.weight, plates);

  return (
    <div className="barbell">
      {bars.length > 1 && (
        <div className="bar-chips" role="group" aria-label="Bar">
          {bars.map((b) => (
            <button
              key={b.id}
              type="button"
              className="bar-chip"
              aria-pressed={b.id === bar.id}
              onClick={() => onBar(b.id)}
            >
              {b.name} <span className="bar-chip-weight">{formatWeight(b.weight)} kg</span>
            </button>
          ))}
        </div>
      )}

      {plates.length === 0 ? (
        <p className="barbell-note">
          No plates set up for {gym.name}. Add them in Settings → Indoor gyms.
        </p>
      ) : result.tooLight ? (
        <div className="barbell-result">
          <p className="barbell-note">
            Lighter than the bar ({bars.length > 1 ? bar.name : 'bar'} {formatWeight(bar.weight)} kg).
          </p>
          <button type="button" className="barbell-suggest" onClick={() => onWeight(bar.weight)}>
            Use {formatWeight(bar.weight)} kg
          </button>
        </div>
      ) : result.exact ? (
        <div className="barbell-result" aria-label={`Each side: ${result.perSide.join(', ')} kg`}>
          <span className="barbell-label">
            {bars.length === 1 ? `${bar.name} ${formatWeight(bar.weight)} kg · ` : ''}each side
          </span>
          {result.perSide.length === 0 ? (
            <span className="barbell-empty">just the bar</span>
          ) : (
            <span className="plates">
              {result.perSide.map((w, i) => (
                <Plate key={i} weight={w} />
              ))}
            </span>
          )}
        </div>
      ) : (
        <div className="barbell-result">
          <p className="barbell-note">
            {formatWeight(weight)} kg can't be built with these plates.
            {result.lower || result.higher ? ' Nearest:' : ''}
          </p>
          <span className="barbell-suggestions">
            {result.lower !== null && (
              <button type="button" className="barbell-suggest" onClick={() => onWeight(result.lower)}>
                {formatWeight(result.lower)} kg
              </button>
            )}
            {result.higher !== null && (
              <button type="button" className="barbell-suggest" onClick={() => onWeight(result.higher)}>
                {formatWeight(result.higher)} kg
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
