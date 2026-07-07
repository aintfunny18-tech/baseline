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

/* Per-exercise how-tos, keyed by the exercise name before the " — ".
   Written for a first-timer: setup, movement, and the cues that matter. */
const EXERCISE_GUIDE = {
  "Goblet squat": {
    what: "A squat while hugging one dumbbell to your chest. The weight out front keeps you balanced, which makes it the friendliest squat there is.",
    steps: [
      "Hold one dumbbell vertically against your chest, both hands cupped under the top end (like holding a goblet).",
      "Feet shoulder-width, toes turned out slightly.",
      "Sit down and back — like reaching for a chair — until your thighs are near parallel, or as deep as feels controlled.",
      "Push through your whole foot to stand back up.",
    ],
    cues: ["Chest stays tall; the dumbbell keeps you honest.", "Heels stay on the floor.", "Knees track in line with your toes."],
  },
  "Floor press": {
    what: "A bench press with the floor as the bench. The floor protects your shoulders and there is nothing to fall off of.",
    steps: [
      "Lie on your back, knees bent, feet flat, a dumbbell in each hand.",
      "Start with upper arms on the floor at ~45° from your body, forearms vertical.",
      "Press both dumbbells up until your arms are straight over your chest.",
      "Lower with control until your upper arms lightly touch the floor. Pause a beat, repeat.",
    ],
    cues: ["Wrists stacked over elbows the whole way.", "Don't let elbows flare straight out to the sides."],
  },
  "One-arm row": {
    what: "Rowing a dumbbell toward your hip while braced on a bench, couch arm, or chair seat.",
    steps: [
      "Put your left knee and left hand on a bench or couch; right foot on the floor. Back flat like a table.",
      "Dumbbell hanging in your right hand.",
      "Pull it up toward your hip pocket — elbow sliding past your ribs.",
      "Lower slowly until the arm is long again. Finish the set, switch sides.",
    ],
    cues: ["Lead with the elbow, not the hand.", "Torso stays square — no twisting to hoist the weight."],
  },
  "Romanian deadlift": {
    what: "A hip hinge: the move for the whole back side of your body — hamstrings and glutes. Also quietly the most useful movement in the gym.",
    steps: [
      "Stand holding a dumbbell in each hand at your thighs, feet hip-width, knees soft (slightly bent, not locked).",
      "Push your hips straight back and let the dumbbells slide down the front of your thighs. Back stays flat.",
      "Stop when you feel a real stretch in the hamstrings — around knee height to mid-shin at first.",
      "Squeeze your glutes and drive hips forward to stand tall.",
    ],
    cues: ["It's a hinge, not a squat — hips go back, knees barely bend more.", "Dumbbells stay close, almost brushing your legs.", "Flat back beats extra depth every time."],
  },
  "Plank": {
    what: "A hold, not a movement. Body in one straight line, everything braced.",
    steps: [
      "Forearms on the floor, elbows under shoulders, legs long, on your toes.",
      "Squeeze your glutes and brace your stomach like someone might poke it.",
      "Hold and breathe normally — no breath-holding.",
    ],
    cues: ["Don't let hips sag toward the floor or pike toward the ceiling.", "Drop to knees to scale — a clean 20 seconds beats a saggy 40."],
  },
  "Reverse lunge": {
    what: "A lunge stepping backward — easier on the knees than stepping forward, which is why it's here.",
    steps: [
      "Stand tall, dumbbells at your sides (or empty-handed at first).",
      "Step one foot back and lower until both knees are near 90°. Back knee hovers above the floor.",
      "Push through the front foot to return to standing. Alternate or finish one side.",
    ],
    cues: ["Torso tall — no folding forward.", "Front heel stays down.", "A fingertip on the wall for balance is completely allowed."],
  },
  "Overhead press": {
    what: "Pressing dumbbells from shoulders to overhead, standing.",
    steps: [
      "Dumbbells at your shoulders, palms facing forward or slightly in.",
      "Press straight up until your arms are locked out and biceps are near your ears.",
      "Lower back to the shoulders with control.",
    ],
    cues: ["Squeeze your glutes so your lower back doesn't arch into a lean-back.", "If it turns into a whole-body push, the weight is too heavy today."],
  },
  "Bent-over row": {
    what: "The two-arm row: hinge and hold, then row both dumbbells to your ribs.",
    steps: [
      "Set up like the Romanian deadlift and hold the hinged position, dumbbells hanging.",
      "Row both dumbbells to your lower ribs.",
      "Lower slowly until arms are long. Stay hinged the whole set.",
    ],
    cues: ["Back flat throughout.", "If your lower back complains about the hold, do one-arm rows instead — same muscles, more support."],
  },
  "Glute bridge with dumbbell": {
    what: "Hip thrusts from the floor with a dumbbell resting on your hips.",
    steps: [
      "Lie on your back, knees bent, feet flat near your hips. Rest a dumbbell across your hips (fold a towel under it).",
      "Push through your heels and lift your hips until your body is straight from knees to shoulders.",
      "Squeeze the glutes hard at the top for a second, then lower.",
    ],
    cues: ["Ribs stay down — lift with glutes, not by arching the back.", "Chin gently tucked."],
  },
  "Side plank": {
    what: "A plank on one forearm — the side-abs version.",
    steps: [
      "Lie on your side, forearm on the floor, elbow under shoulder.",
      "Stack or stagger your feet and lift your hips until your body is a straight line.",
      "Hold, breathe, switch sides.",
    ],
    cues: ["Push the floor away — don't sink into the shoulder.", "Bottom knee down to scale."],
  },
  "Squats": {
    what: "The bodyweight version of the goblet squat.",
    steps: [
      "Feet shoulder-width, arms reaching forward as a counterbalance.",
      "Sit down and back to a controlled depth, then stand.",
    ],
    cues: ["Heels down, chest tall.", "Squat to a couch and stand back up if depth feels wobbly at first."],
  },
  "Push-ups": {
    what: "Adjustable to any level by raising your hands.",
    steps: [
      "Hands slightly wider than shoulders, body in one straight plank line.",
      "Lower your chest as one piece — hips and chest travel together.",
      "Press back up.",
    ],
    cues: ["Easier: hands on a counter, table, or couch arm. Harder: floor.", "The plank rules apply — no sagging hips."],
  },
  "Glute bridges": {
    what: "Same as the dumbbell version, no weight.",
    steps: [
      "On your back, knees bent, push through heels, lift hips, squeeze at the top, lower.",
    ],
    cues: ["Slow beats fast here."],
  },
  "Marching in place or mountain climbers": {
    what: "Pick your intensity: marching is the calm version, mountain climbers the spicy one.",
    steps: [
      "Marching: knees toward hip height, arms swinging, steady rhythm.",
      "Mountain climbers: push-up position, drive knees toward your chest one at a time.",
    ],
    cues: ["For climbers: hips stay level with shoulders — don't pike up."],
  },
  "Hip flexor stretch (half-kneel)": {
    steps: ["Half-kneel (back knee on a pillow). Tuck your pelvis slightly, then shift your whole body forward an inch or two.", "You should feel it across the front of the hip on the kneeling side."],
    cues: ["Stay tall — leaning way forward defeats it."],
  },
  "Hamstring stretch": {
    steps: ["Prop one heel on a low step, leg straight.", "Hinge slightly forward with a flat back until you feel the pull behind the thigh."],
  },
  "Quad stretch": {
    steps: ["Standing (hold a wall), grab your ankle behind you and gently pull the heel toward your glutes.", "Knees together, torso tall."],
    cues: ["Don't arch the lower back to fake range."],
  },
  "Calf stretch": {
    steps: ["Hands on a wall, one leg back with the heel down and knee straight.", "Lean toward the wall until the calf pulls."],
  },
  "Figure-4 glute stretch": {
    steps: ["On your back, cross one ankle over the opposite knee.", "Reach through and pull that thigh toward your chest."],
  },
  "Wall sit": {
    steps: ["Back flat against a wall, slide down toward 90° at the knees — higher is fine to start.", "Hold and breathe."],
    cues: ["This one is knee-support work. Shaking legs are normal."],
  },
  "Slow step-downs from a stair": {
    steps: ["Stand on the bottom stair, one foot hanging off the edge. Hold the rail.", "Bend the standing knee and slowly lower the free heel toward the floor. Tap, then push back up."],
    cues: ["Slow is the entire point.", "The standing knee tracks over the toes, not caving inward."],
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
