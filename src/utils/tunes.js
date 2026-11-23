// Rest alarm tunes as data: note lists and the siren's frequency sweep.
// No playback code here; src/utils/alert.js plays them.
//
// A tune is { label, wave, notes?, sweep?, lengthS }.
//   notes: [{ hz: number | null, startS, durS }], every repeat included.
//          hz null is a rest (the player skips it). The first note starts at 0 s;
//          the player adds its own small lead.
//   sweep: { lowHz, highHz, riseS, fallS } for the siren (one oscillator).
//   lengthS: when the tune is over (the end of the last sounding note + 0.1 s).

/** Picker order in Settings. */
export const TUNE_IDS = ['beep', 'nokia', 'polka', 'siren'];
export const DEFAULT_TUNE = 'beep';

const MAX_LENGTH_S = 30; // longer tunes keep only the phrases that end by 30 s
const TAIL_S = 0.1;

const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/**
 * Repeats one phrase (phrase, gap, phrase, …) and keeps only the phrases whose
 * last sounding note ends by 30 s.
 * phrase: [[midi | null, eighths]], where null is a rest and 0.5 eighths is a sixteenth.
 */
function repeated(phrase, eighthS, gapS) {
  const one = [];
  let t = 0;
  for (const [midi, eighths] of phrase) {
    const durS = eighths * eighthS;
    one.push({ hz: midi === null ? null : midiToHz(midi), startS: t, durS });
    t += durS;
  }
  const phraseS = t;
  const sounding = one.filter((n) => n.hz !== null);
  const lastEnd = sounding.at(-1).startS + sounding.at(-1).durS;

  const notes = [];
  for (let start = 0; start + lastEnd <= MAX_LENGTH_S; start += phraseS + gapS) {
    for (const n of one) notes.push({ ...n, startS: start + n.startS });
  }
  return { notes, lengthS: lengthOf(notes) };
}

function lengthOf(notes) {
  const ends = notes.filter((n) => n.hz !== null).map((n) => n.startS + n.durS);
  return Math.max(...ends) + TAIL_S;
}

// Note names as MIDI numbers.
const A4 = 69, GS4 = 68, B4 = 71, C5 = 72, CS5 = 73, D5 = 74, E5 = 76, F5 = 77;
const FS5 = 78, GS5 = 80, A5 = 81, B5 = 83, CS6 = 85, D6 = 86, E6 = 88;

// The Nokia ringtone (RTTTL `8e6,8d6,f#,g#,8c#6,8b,d,e,8b,8a,c#,e,2a`) at 225 bpm.
const nokia = repeated(
  [
    [E6, 1], [D6, 1], [FS5, 2], [GS5, 2],
    [CS6, 1], [B5, 1], [D5, 2], [E5, 2],
    [B5, 1], [A5, 1], [CS5, 2], [E5, 2],
    [A5, 4],
  ],
  60 / 225 / 2, // an eighth: 0.1333 s, so a phrase is 2.933 s
  1.0,
);

// Säkkijärven polkka, main theme in A minor, 2/4 at 126 bpm.
// Written down from memory, not from a score: check it by ear with Test sound.
const polka = repeated(
  [
    [E5, 1], [E5, 0.5], [E5, 0.5], [E5, 1], [D5, 1], // bar 1
    [C5, 1], [B4, 1], [A4, 1], [C5, 1], //             bar 2
    [E5, 1], [E5, 0.5], [E5, 0.5], [E5, 1], [F5, 1], // bar 3
    [E5, 2], [null, 2], //                             bar 4
    [D5, 1], [D5, 0.5], [D5, 0.5], [D5, 1], [C5, 1], // bar 5
    [B4, 1], [A4, 1], [GS4, 1], [B4, 1], //            bar 6
    [D5, 1], [C5, 1], [B4, 1], [GS4, 1], //            bar 7
    [A4, 2], [null, 2], //                             bar 8
  ],
  60 / 126 / 2, // an eighth: 0.238 s, so a phrase (8 bars) is 7.62 s
  0.5,
);

// Today's three beeps.
const beepNotes = [
  { hz: 880, startS: 0, durS: 0.24 },
  { hz: 880, startS: 0.32, durS: 0.24 },
  { hz: 1320, startS: 0.64, durS: 0.24 },
];

export const TUNES = {
  beep: { label: 'Beep', wave: 'sine', notes: beepNotes, lengthS: lengthOf(beepNotes) },
  nokia: { label: 'Nokia tune', wave: 'square', ...nokia },
  polka: { label: 'Säkkijärven polkka', wave: 'square', ...polka },
  // Rising and falling like the Finnish public danger signal. 400–1000 Hz is an
  // approximation chosen by ear, not the official specification.
  siren: {
    label: 'Yleinen vaaramerkki',
    wave: 'sine',
    sweep: { lowHz: 400, highHz: 1000, riseS: 7, fallS: 7 },
    lengthS: MAX_LENGTH_S,
  },
};

/** id if it is a known tune, otherwise the default (an id from a newer app version). */
export const tuneIdOrDefault = (id) => (TUNE_IDS.includes(id) ? id : DEFAULT_TUNE);
