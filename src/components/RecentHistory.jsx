import { useId, useState } from 'react';
import { exerciseName } from '../program/store.js';
import { historyGroups, recentLine } from '../workout/recent.js';
import { InsetGroup, ListRow } from './ui.jsx';

/**
 * Workout-level "History · last 3" bar (below the Gym bar): opens to the last
 * 3 sessions of every exercise in this workout (any gym, from slot.recent).
 * Hidden when no exercise has history (new exercises, guests, offline without
 * saved history).
 */
export default function RecentHistory({ slots, gymId = null }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const groups = historyGroups(slots);
  if (groups.length === 0) return null;
  const groupId = (i) => `${panelId}-${i}`;

  return (
    <InsetGroup>
      <ListRow
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={open ? groups.map((_, i) => groupId(i)).join(' ') : undefined}
      >
        <div className="history-bar-row">
          <div className="row-title">History · last 3</div>
          <span className={`history-bar-arrow${open ? ' is-open' : ''}`} aria-hidden="true">
            ▾
          </span>
        </div>
      </ListRow>
      {open &&
        groups.map((g, i) => (
          // The groups stay direct siblings of the row (no wrapper) so the
          // .list-row + .list-row dividers still apply; each has an id that
          // the row's aria-controls lists.
          <div key={g.id} id={groupId(i)} className="list-row history-bar-group">
            <div className="list-row-content">
              <div className="row-subtitle">{exerciseName(g.id)}</div>
              <ul className="history-bar-list">
                {g.list.map((r, j) => (
                  <li key={`${r.finishedAt}-${j}`}>{recentLine(r, gymId)}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
    </InsetGroup>
  );
}
