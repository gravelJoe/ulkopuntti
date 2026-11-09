import { useEffect, useReducer, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { exerciseName, getWorkout } from '../program/store.js';
import { getRestSeconds } from '../data/preferences.js';
import { clearDraft, isGuest, loadDraft, markFinishedToday, saveDraft, saveSession } from '../data/repository.js';
import { createSession, nextSet, progress, sessionReducer, toSavedSession } from '../workout/session.js';
import { useRestTimer } from '../hooks/useRestTimer.js';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { LargeTitle, NavBar } from '../components/ui.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import ExerciseCard from '../components/ExerciseCard.jsx';
import RestTimerOverlay from '../components/RestTimerOverlay.jsx';

export default function WorkoutScreen() {
  const { workoutId } = useParams();
  const workout = getWorkout(workoutId);
  const navigate = useNavigate();
  const [session, dispatch] = useReducer(sessionReducer, null);
  const [saving, setSaving] = useState(false);
  const rest = useRestTimer();
  const confirm = useConfirm();
  const cardRefs = useRef([]);
  const finishRef = useRef(null);
  useWakeLock(true);

  // Resume the in-progress draft for this workout, or start fresh.
  // Keyed on the id (not the object): a program refresh from the server
  // must not restart a workout that's in progress.
  useEffect(() => {
    const workout = getWorkout(workoutId);
    if (!workout) return;
    let alive = true;
    (async () => {
      const draft = await loadDraft();
      const s = draft?.workoutId === workout.id ? draft : await createSession(workout);
      if (alive) dispatch({ type: 'load', session: s });
    })();
    return () => {
      alive = false;
    };
  }, [workoutId]);

  // Keep the draft up to date so a reload / screen lock doesn't lose anything.
  useEffect(() => {
    if (session && !saving) saveDraft(session);
  }, [session, saving]);

  if (!workout) return <Navigate to="/" replace />;

  const { done, total } = session ? progress(session) : { done: 0, total: 0 };
  const next = session ? nextSet(session) : null;

  function handleToggleSet(slotIndex, index) {
    const action = { type: 'toggleSet', slot: slotIndex, index };
    const slot = session.slots[slotIndex];
    const wasDone = slot.sets[slot.selected][index];
    dispatch(action);

    // Marking a set done (not undoing) starts the rest — unless it was the last set.
    if (wasDone) return;
    const after = sessionReducer(session, action);
    const upcoming = nextSet(after);
    const doneSets = after.slots[slotIndex].sets[slot.selected];

    // Very last set of the workout → save and go home automatically.
    if (!upcoming) {
      handleFinish(after, { auto: true });
      return;
    }

    // Exercise complete → scroll to the next unfinished one.
    if (doneSets.every(Boolean)) {
      setTimeout(() => cardRefs.current[upcoming.slot]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }

    const nextSlot = after.slots[upcoming.slot];
    rest.start(getRestSeconds(), {
      justDone: `${exerciseName(slot.selected)} · Set ${doneSets.filter(Boolean).length} of ${doneSets.length} done`,
      next: {
        name: exerciseName(nextSlot.selected),
        set: upcoming.index + 1,
        weight: nextSlot.weight[nextSlot.selected],
      },
    });
  }

  // Leaving keeps the workout in progress (resumable from Home) — unless nothing was done yet.
  async function handleBack() {
    if (done === 0) await clearDraft();
    navigate('/');
  }

  // auto: called when the last set is ticked — no "finish early?" question,
  // and it returns to Home instead of the summary.
  async function handleFinish(state = session, { auto = false } = {}) {
    const p = progress(state);
    if (
      !auto &&
      p.done < p.total &&
      !(await confirm({
        title: 'Finish workout?',
        message: `${p.done} of ${p.total} sets done. Sets you didn't do won't be saved.`,
        confirmLabel: 'Finish',
        cancelLabel: 'Keep going',
      }))
    )
      return;

    if (isGuest()) {
      const choice = await confirm({
        title: 'Save this workout?',
        message: "You're using Puntti as a guest, so workouts aren't saved. Log in to keep it in your history.",
        confirmLabel: 'Log in',
        cancelLabel: "Don't save",
      });
      if (choice === null) return; // dismissed — stay here
      if (choice) {
        navigate('/welcome', { state: { returnTo: `/workout/${workout.id}` } });
        return;
      }
      await clearDraft();
      markFinishedToday(workout.id);
      rest.skip();
      navigate('/', { replace: true });
      return;
    }

    setSaving(true);
    const toSave = toSavedSession(state); // same id on every retry → no duplicates
    for (;;) {
      try {
        const saved = await saveSession(toSave);
        await clearDraft();
        markFinishedToday(workout.id);
        rest.skip();
        if (auto) navigate('/', { replace: true, state: { savedWorkout: workout.name } });
        else navigate(`/history/${saved.id}`, { replace: true, state: { justFinished: true } });
        return;
      } catch (err) {
        const retry = await confirm({
          title: "Couldn't save workout",
          message: `${err.message} Your workout is still kept on this phone.`,
          confirmLabel: 'Try again',
          cancelLabel: 'Not now',
        });
        if (!retry) {
          setSaving(false);
          return;
        }
      }
    }
  }

  return (
    <main className="screen">
      <NavBar backLabel="Puntti" onBack={handleBack} />
      <LargeTitle title={workout.name} subtitle={session ? `${done} of ${total} sets done` : ' '} />

      {session?.slots.map((slot, i) => (
        <ExerciseCard
          key={i}
          slot={slot}
          slotIndex={i}
          currentIndex={next?.slot === i ? next.index : -1}
          dispatch={dispatch}
          onToggleSet={(index) => handleToggleSet(i, index)}
          cardRef={(el) => (cardRefs.current[i] = el)}
        />
      ))}

      {session && (
        <div className="finish-area" ref={finishRef}>
          <button className="button-primary" disabled={done === 0 || saving} onClick={() => handleFinish()}>
            Finish workout
          </button>
          {done === 0 && <p className="finish-note">Mark at least one set done to finish.</p>}
        </div>
      )}

      <RestTimerOverlay
        timer={rest.timer}
        remainingMs={rest.remainingMs}
        onFastForward={rest.fastForward}
        onExtend={rest.extend}
        onSkip={rest.skip}
      />
    </main>
  );
}
