import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getSessionHistory } from '../data/repository.js';
import { getExercise, getGym, getProgram, holdWeeks, progressionOf, saveProgram, useProgram } from '../program/store.js';
import { describeEffect, isHeldWeek, showsHold, weeklyHistory } from '../workout/progression.js';
import { planNextTime } from '../workout/session.js';
import { INCREASE_DEFAULT } from '../config/workouts.js';
import { formatWeight } from '../utils/format.js';
import { DateTime } from 'luxon';
import { LOCALE, nowISO } from '../utils/dates.js';
import { InsetGroup, LargeTitle, ListRow, NavBar } from '../components/ui.jsx';

export const RESULT_LABEL = { success: 'Go up', neutral: 'Repeat', fail: 'Go down' };
const parseKg = (text) => Number(String(text).replace(',', '.').trim());
const weekLabel = (key) =>
  `Week of ${DateTime.fromISO(key).toLocaleString({ day: 'numeric', month: 'short' }, { locale: LOCALE })}`;

const signedKg = (kg) => `${kg > 0 ? '+' : '−'}${formatWeight(Math.abs(kg))} kg`;

/**
 * Second line of the "Next week" row: the planned weight, the change and why,
 * plus what the gym loads. Checks where the plan came from first (Settings
 * edit / starting weight), then the hold, then the last week's result.
 */
function upcomingText(plan, gymName) {
  const holding = plan.holdWeek > 0 && showsHold(plan.holdWeeks);
  const change = Math.round((plan.planned - plan.base) * 100) / 100;
  const planned = `Planned ${formatWeight(plan.planned)} kg`;
  let why;
  if (plan.source === 'anchor') why = `${planned} · set by you`;
  else if (plan.source === 'start') why = `${planned} · starting weight`;
  else if (plan.action === 'down' && change < 0)
    why = `${planned} (${signedKg(change)}) after Go down${holding ? ` · held ${plan.holdWeek} of ${plan.holdWeeks}` : ''}`;
  else if (holding) why = `Same weight: hold ${plan.holdWeek} of ${plan.holdWeeks}`;
  else if (plan.action === 'up' && change > 0) why = `${planned} (${signedKg(change)}) after Go up`;
  else why = 'Same weight after Repeat';

  if (plan.unrounded) return `${why} · not rounded: no plates at this gym`;
  if (plan.cantLoadMore) return `${why} · can't load more at ${gymName}`;
  return plan.rounded !== plan.planned ? `${why} · ${gymName} loads ${formatWeight(plan.rounded)}` : why;
}

/**
 * One indoor exercise as one timeline: a "Next week" row (the plan for the
 * week after the newest trained week, rounded like the workout card does for the
 * gym and bar used last time), then the past weeks, newest first. Archived exercises show their history only.
 */
export default function ExerciseHistoryScreen() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  useProgram(); // re-render when the program (e.g. a planned weight) changes
  const [data, setData] = useState(undefined); // undefined = loading
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const exercise = getExercise(exerciseId);

  useEffect(() => {
    let alive = true;
    getSessionHistory().then(({ sessions, offline }) => {
      if (alive) setData({ sessions: sessions ? sessions.filter((s) => s.place === 'indoor') : null, offline });
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!user) return <Navigate to="/history" replace />;
  if (!exercise || exercise.place !== 'indoor') return <Navigate to="/history?view=exercise" replace />;

  const back = <NavBar backLabel="Back" onBack={() => navigate(-1)} />;
  if (data === undefined) return <main className="screen">{back}</main>;

  const { sessions, offline } = data;
  if (sessions === null)
    return (
      <main className="screen">
        {back}
        <LargeTitle title={exercise.name} />
        <InsetGroup>
          <div className="list-row empty-state">No saved history on this phone yet. Connect once to see it.</div>
        </InsetGroup>
      </main>
    );

  const hold = holdWeeks();
  const increase = progressionOf(exerciseId)?.increase ?? exercise.progression?.increase ?? INCREASE_DEFAULT;
  const rows = weeklyHistory({ exerciseId, holdWeeks: hold, increase, history: sessions });

  // Next week: rounded for the gym and bar of the latest session where it was lifted.
  const lastLifted = sessions.find((s) => s.exercises.some((e) => e.exerciseId === exerciseId && e.sets.some(Boolean)));
  const lastEx = lastLifted?.exercises.find((e) => e.exerciseId === exerciseId);
  const gym = getGym(lastLifted?.gymId);
  const next = exercise.archived ? null : planNextTime(exerciseId, sessions, gym?.id ?? null, lastEx?.bar, { offline, upcoming: true }).plan;

  function startEdit() {
    setDraft(formatWeight(next.planned));
    setEditing(true);
    setError('');
  }

  async function saveAnchor() {
    const weight = parseKg(draft);
    if (!(weight >= 0 && weight <= 999)) return setError('Enter a weight from 0 to 999 kg');
    const program = getProgram();
    const exercises = program.exercises.map((x) => {
      if (x.id !== exerciseId) return x;
      const old = x.progression ?? {};
      return {
        ...x,
        progression: {
          increase: old.increase ?? INCREASE_DEFAULT,
          ...old,
          anchor: { weight: Math.round(weight * 100) / 100, at: nowISO() },
        },
      };
    });
    setBusy(true);
    try {
      await saveProgram({ ...program, exercises });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      {back}
      <LargeTitle title={exercise.name} subtitle={exercise.archived ? 'Deleted exercise · history only' : null} />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <InsetGroup footer={offline ? 'Offline: showing the history saved on this phone.' : 'Tap Next week to change the planned weight.'}>
        {next && editing && (
          <ListRow className="row-upcoming">
            <div className="row-title">Planned weight for next week</div>
            <div className="progression-edit">
              <input
                className="form-input"
                inputMode="decimal"
                aria-label={`${exercise.name} planned weight in kg`}
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveAnchor()}
              />
              <span className="stepper-unit">kg</span>
              <button className="inline-link" disabled={busy} onClick={saveAnchor}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button className="inline-link" disabled={busy} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </ListRow>
        )}
        {next && !editing && (
          <ListRow className="row-upcoming" onClick={startEdit} chevron>
            <div className="detail-row">
              <div>
                <div className="row-title">Next week</div>
                <div className="row-meta">{upcomingText(next, gym ? gym.name : 'your gym')}</div>
              </div>
              <div className="detail-weight">
                {formatWeight(next.unrounded ? next.planned : next.rounded)}
                <span className="stepper-unit">kg</span>
              </div>
            </div>
          </ListRow>
        )}
        {rows.length === 0 && <div className="list-row empty-state">No weeks with a result yet.</div>}
        {rows.map((row) => {
          const done = row.exercise.sets.filter(Boolean).length;
          const meta = [
            row.outcome !== 'fail' && isHeldWeek(row.holdWeek, hold) ? 'Kept (hold)' : RESULT_LABEL[row.outcome],
            `${done}/${row.exercise.sets.length} sets`,
            row.holdWeek > 0 && showsHold(hold) && `held (week ${row.holdWeek} of ${hold})`,
            row.extraSessions > 0 && `+${row.extraSessions} more`,
          ]
            .filter(Boolean)
            .join(' · ');
          const id = row.session.id;
          return (
            <ListRow key={row.week} onClick={id ? () => navigate(`/history/${id}`) : undefined} chevron={Boolean(id)}>
              <div className="detail-row">
                <div>
                  <div className="row-title">{weekLabel(row.week)}</div>
                  <div className="row-meta">{meta}</div>
                  <div className="row-effect">→ {describeEffect(row, hold)}</div>
                </div>
                <div className="detail-weight">
                  {formatWeight(row.exercise.weight)}
                  <span className="stepper-unit">kg</span>
                </div>
              </div>
            </ListRow>
          );
        })}
      </InsetGroup>
    </main>
  );
}
