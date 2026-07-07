/* Baseline — exercise library, week templates, and copy strings.
   Tone rules: short declarative sentences, no exclamation points,
   no calories, no good/bad food framing, no guilt. */

const LIBRARY = {
  mile: {
    name: "Run — mile program",
    kind: "run",
    minutes: 30,
    blurb: "Treadmill walk/run progression toward a sub-9:00 mile. Work the phase that currently feels honest; move up when it feels easy.",
    phases: [
      {
        name: "Phase 1 — Base",
        session: "Walk 3 min / easy jog 2 min, repeat 4 times",
        timer: { prep: 10, work: 120, rest: 180, rounds: 4, workLabel: "Jog", restLabel: "Walk" },
        details: [
          "Warm up with 5 minutes of brisk walking first.",
          "Jog at a pace where you could speak in sentences (roughly 4.5–5.0 mph).",
          "Cool down with 3 minutes of easy walking.",
          "Move to Phase 2 when all 4 rounds feel easy.",
        ],
      },
      {
        name: "Phase 2 — Build",
        session: "Jog 5 min / walk 2 min, repeat 3 times",
        timer: { prep: 10, work: 300, rest: 120, rounds: 3, workLabel: "Jog", restLabel: "Walk" },
        details: [
          "Same warm-up: 5 minutes of brisk walking.",
          "Add 0.1–0.2 mph to the jog only when the current speed feels comfortable.",
          "Move on when 3 rounds at ~5.5 mph feel steady.",
        ],
      },
      {
        name: "Phase 3 — Continuous",
        session: "20 min continuous easy jog, then 4 × 20-second pickups",
        timer: { prep: 10, work: 1200, rest: 0, rounds: 1, workLabel: "Easy jog", restLabel: "" },
        details: [
          "The 20 minutes should stay conversational. Slow down rather than stop.",
          "Pickups: 20 seconds at a noticeably quicker pace, full walking recovery between.",
          "Two to three weeks here builds the base the fast mile sits on.",
        ],
      },
      {
        name: "Phase 4 — Sharpen",
        session: "4 × 0.25 mi at 6.8–7.0 mph, walk 2–3 min between",
        timer: { prep: 10, work: 130, rest: 150, rounds: 4, workLabel: "Interval", restLabel: "Walk" },
        details: [
          "6.7 mph is exactly a 9:00 mile. The intervals run slightly faster so the full mile has room.",
          "If the last interval falls apart, drop the speed a notch next time. That is information, not a setback.",
        ],
      },
      {
        name: "Timed mile — monthly",
        session: "Warm up well, then run 1 mile steady-hard and log the time",
        timer: null,
        details: [
          "Once a month, not more. Log it as a session with the time in minutes.",
          "The first one sets the baseline. Every one after that is the trend.",
        ],
      },
    ],
    notes: [
      "Set the treadmill to 1% incline. It rides more like outdoor ground and is easier on the knees.",
      "Quick, soft steps. Shorter strides land quieter and kinder on the joints.",
      "Sharp pain is a stop sign. Effort discomfort is fine; joint pain that sharpens as you go is not.",
      "The dumbbell days directly support the knees. They count toward the mile too.",
    ],
  },

  dumbbellA: {
    name: "Dumbbells — workout A",
    kind: "strength",
    minutes: 25,
    blurb: "Full body, 20–30 minutes. Rest 60–90 seconds between sets.",
    exercises: [
      "Goblet squat — 3 × 10",
      "Floor press — 3 × 10",
      "One-arm row — 3 × 10 per side",
      "Romanian deadlift — 3 × 10",
      "Plank — 3 × 30 seconds",
    ],
    notes: [
      "Pick a weight that leaves 2–3 clean reps in the tank on every set.",
      "When all sets hit the target reps with good form, go up a small step next time.",
    ],
  },

  dumbbellB: {
    name: "Dumbbells — workout B",
    kind: "strength",
    minutes: 25,
    blurb: "The alternate full-body day. Rest 60–90 seconds between sets.",
    exercises: [
      "Reverse lunge — 3 × 8 per side",
      "Overhead press — 3 × 8",
      "Bent-over row — 3 × 10",
      "Glute bridge with dumbbell — 3 × 12",
      "Side plank — 3 × 20 seconds per side",
    ],
    notes: [
      "Alternate A and B across strength days.",
      "Lunges and bridges are knee-support work in disguise.",
    ],
  },

  circuit: {
    name: "Bodyweight circuit",
    kind: "strength",
    minutes: 18,
    blurb: "No equipment, 15–20 minutes. 3–4 rounds, rest 60–75 seconds between rounds.",
    exercises: [
      "Squats — 12",
      "Push-ups — 8–10 (hands elevated to adjust difficulty)",
      "Glute bridges — 10",
      "Marching in place or mountain climbers — 30 seconds",
      "Plank — 30 seconds",
    ],
    notes: [
      "The anywhere option — hotel rooms, living rooms, short on time. A short version still counts.",
    ],
  },

  stretch: {
    name: "Stretch & knee care",
    kind: "mobility",
    minutes: 12,
    blurb: "10–15 minutes. Doubles as a cooldown or a standalone easy day.",
    exercises: [
      "Hip flexor stretch (half-kneel) — 45 seconds per side",
      "Hamstring stretch — 45 seconds per side",
      "Quad stretch — 30 seconds per side",
      "Calf stretch — 45 seconds per side",
      "Figure-4 glute stretch — 45 seconds per side",
      "Wall sit — 3 × 30 seconds",
      "Slow step-downs from a stair — 2 × 8 per side",
    ],
    notes: [
      "The wall sits and step-downs are the millennial-knee insurance policy.",
    ],
  },

  easyWalk: {
    name: "Easy walk",
    kind: "walk",
    minutes: 25,
    blurb: "20–30 minutes, any pace that feels good. Evening-friendly.",
    exercises: [],
    notes: ["Counts fully. Consistency is the whole game."],
  },

  longWalk: {
    name: "Long walk or hike",
    kind: "walk",
    minutes: 50,
    blurb: "45–60 minutes. The weekend anchor — a route you actually like, headphones optional.",
    exercises: [],
    notes: ["Weekends have been the quietest days in your data. This one session changes that."],
  },
};

/* Week templates: 0 = Monday … 6 = Sunday.
   `optional` sessions render softer and never appear as missed. */
const WEEK_TEMPLATES = {
  summer: [
    { day: 0, id: "mile", time: "morning" },
    { day: 1, id: "dumbbellA", time: "morning" },
    { day: 2, id: "easyWalk", time: "evening", optional: true },
    { day: 3, id: "circuit", time: "evening", optional: true },
    { day: 4, id: "mile", time: "morning" },
    { day: 5, id: "longWalk", time: "anytime" },
    { day: 6, id: "stretch", time: "anytime", optional: true },
  ],
  school: [
    { day: 0, id: "mile", time: "morning" },
    { day: 1, id: "dumbbellA", time: "morning" },
    { day: 2, id: "easyWalk", time: "morning", optional: true },
    { day: 3, id: "dumbbellB", time: "morning" },
    { day: 4, id: "mile", time: "morning" },
    { day: 5, id: "longWalk", time: "anytime" },
    { day: 6, id: "stretch", time: "anytime", optional: true },
  ],
};

const SCHOOL_YEAR_START = "2026-08-17";

const COPY = {
  reviewSessions: (n) => {
    if (n >= 3) return `${n} sessions last week. The pattern is working.`;
    if (n === 2) return "2 sessions last week. A solid middle.";
    if (n === 1) return "1 session last week. This week, two mornings is a realistic reset.";
    return "Last week had no sessions in it. That happens. The reset is one morning, kept small.";
  },
  trendLine: (perWeek) => {
    if (perWeek === null) return "Not enough weigh-ins yet for a trend.";
    const dir = perWeek < -0.1 ? "down" : perWeek > 0.1 ? "up" : "holding steady";
    const rate = Math.abs(perWeek).toFixed(1);
    if (dir === "holding steady") return "Weight is holding steady.";
    const band = perWeek <= -1 && perWeek >= -2
      ? " That is inside the sustainable 1–2 lb/week band."
      : perWeek < -2 ? " Faster than the sustainable band — worth keeping meals regular rather than pushing harder." : "";
    return `Trend: ${dir} ${rate} lb/week.${band}`;
  },
  checkinLine: (days) => `Checked in ${days} of the last 7 days.`,
};
