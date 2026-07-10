/* Baseline — app logic. Local-first, no build step. */
"use strict";

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function todayISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return todayISO(d);
}
function weekMonday(iso = todayISO()) {
  const d = new Date(iso + "T12:00:00");
  const shift = (d.getDay() + 6) % 7; // Mon=0
  return addDays(iso, -shift);
}
function dowIndex(iso) { // Mon=0 … Sun=6
  return (new Date(iso + "T12:00:00").getDay() + 6) % 7;
}
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function fmtNice(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- settings ---------- */
const DEFAULT_SETTINGS = {
  goalWeight: 225,
  goalNote: "school-start checkpoint",
  mealTimes: { breakfast: "08:00", lunch: "12:30", dinnerBy: "20:30" },
  streaksOptIn: true,
  scheduleMode: "auto", // auto | summer | school
  stepStart: 5500,
  stepRampPerWeek: 250,
  stepCap: 8500,
  gameMode: true,
  firstUse: null,
};
let SETTINGS = { ...DEFAULT_SETTINGS };

async function loadSettings() {
  const row = await DB.get("kv", "settings");
  SETTINGS = { ...DEFAULT_SETTINGS, ...(row ? row.value : {}) };
  if (!SETTINGS.firstUse) {
    SETTINGS.firstUse = todayISO();
    await saveSettings();
  }
}
async function saveSettings() {
  await DB.put("kv", { key: "settings", value: SETTINGS });
}

function scheduleMode(date = todayISO()) {
  if (SETTINGS.scheduleMode !== "auto") return SETTINGS.scheduleMode;
  return date < SCHOOL_YEAR_START ? "summer" : "school";
}
function stepGoal(date = todayISO()) {
  const weeks = Math.max(0, Math.floor((new Date(date) - new Date(SETTINGS.firstUse)) / (7 * 864e5)));
  return Math.min(SETTINGS.stepStart + weeks * SETTINGS.stepRampPerWeek, SETTINGS.stepCap);
}

/* ---------- weights ---------- */
async function sortedWeights() {
  const rows = await DB.all("weights");
  return rows.sort((a, b) => a.date < b.date ? -1 : 1);
}
function movingAvg(rows, window = 7) {
  // returns [{date, ma}] aligned to rows
  return rows.map((r, i) => {
    const slice = rows.slice(Math.max(0, i - window + 1), i + 1);
    return { date: r.date, ma: slice.reduce((s, x) => s + x.lbs, 0) / slice.length };
  });
}
function trendPerWeek(rows) {
  // lb/week from smoothed values ~7 days apart; null when too sparse
  if (rows.length < 4) return null;
  const ma = movingAvg(rows);
  const last = ma[ma.length - 1];
  const targetDate = addDays(last.date, -7);
  let prev = null;
  for (let i = ma.length - 1; i >= 0; i--) {
    if (ma[i].date <= targetDate) { prev = ma[i]; break; }
  }
  if (!prev) return null;
  const days = (new Date(last.date) - new Date(prev.date)) / 864e5;
  if (days < 4 || days > 21) return null;
  return (last.ma - prev.ma) / days * 7;
}

/* ---------- momentum game ----------
   Points reward attention and follow-through, never a particular food choice,
   weight, or check-in answer. Everything is derived from the existing log. */
const LEVEL_SIZE = 80;
const LEVEL_NAMES = [
  "On the board",
  "Finding rhythm",
  "Building range",
  "Steady operator",
  "In motion",
];

function levelName(level) {
  return LEVEL_NAMES[level - 1] || `Momentum ${level}`;
}

function gameDay(map, date) {
  if (!map[date]) map[date] = { date, points: 0, reasons: [] };
  return map[date];
}

function addGamePoints(map, date, points, reason) {
  if (!date || date < SETTINGS.firstUse) return;
  const day = gameDay(map, date);
  day.points += points;
  day.reasons.push({ points, reason });
}

async function gameSnapshot(date = todayISO()) {
  const [checkins, sessions, meals, weights, wins, kv] = await Promise.all([
    DB.all("checkins"), DB.all("sessions"), DB.all("meallog"),
    DB.all("weights"), DB.all("wins"), DB.all("kv"),
  ]);
  const days = {};

  checkins.forEach((c) => {
    const fields = [c.meals, c.dinner, c.movement].filter(Boolean).length;
    if (fields) addGamePoints(days, c.date, fields * 4, "honest check-in");
  });

  const sessionDates = new Set();
  sessions.forEach((s) => sessionDates.add(s.date));
  sessionDates.forEach((d) => addGamePoints(days, d, 15, "intentional movement"));

  const mealSlots = {};
  meals.forEach((m) => {
    if (!mealSlots[m.date]) mealSlots[m.date] = new Set();
    mealSlots[m.date].add(m.slot);
  });
  Object.entries(mealSlots).forEach(([d, slots]) =>
    addGamePoints(days, d, Math.min(8, slots.size * 2), "meal awareness"));

  const weightDates = new Set(weights.map((w) => w.date));
  weightDates.forEach((d) => addGamePoints(days, d, 3, "trend check"));

  const winDates = new Set(wins.map((w) => w.date));
  winDates.forEach((d) => addGamePoints(days, d, 4, "win noticed"));

  const dinnerDates = new Set();
  const stepGoalDates = new Set();
  const pauseDates = new Set();
  kv.forEach((row) => {
    if (row.key.startsWith("dinner:")) {
      const d = row.key.slice(7);
      dinnerDates.add(d);
      addGamePoints(days, d, 5, "dinner decided");
    } else if (row.key.startsWith("steps:")) {
      const d = row.key.slice(6);
      if (Number(row.value) >= stepGoal(d)) {
        stepGoalDates.add(d);
        addGamePoints(days, d, 10, "step target");
      }
    } else if (row.key.startsWith("quest:") && row.key.endsWith(":pause") && row.value) {
      const d = row.key.slice(6, -6);
      pauseDates.add(d);
      addGamePoints(days, d, 8, "mindful pause");
    }
  });

  const orderedDays = Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  const total = orderedDays.reduce((sum, d) => sum + d.points, 0);
  const level = Math.floor(total / LEVEL_SIZE) + 1;
  const levelPoints = total % LEVEL_SIZE;
  const todayPoints = days[date] ? days[date].points : 0;
  const quests = [
    {
      id: "dinner",
      title: "Decide dinner",
      text: "Make the later choice easier now.",
      done: dinnerDates.has(date),
      points: 5,
    },
    {
      id: "move",
      title: "Move with intention",
      text: "A planned session or your step target counts.",
      done: sessionDates.has(date) || stepGoalDates.has(date),
      points: 15,
    },
    {
      id: "pause",
      title: "Take one pause",
      text: "Before seconds, breathe and check whether you are still hungry.",
      done: pauseDates.has(date),
      points: 8,
    },
  ];

  const weekStart = weekMonday(date);
  const thisWeek = (set) => [...set].filter((d) => d >= weekStart && d <= addDays(weekStart, 6)).length;
  const checkedDates = new Set(checkins.filter((c) => c.meals || c.dinner || c.movement).map((c) => c.date));
  const movementDates = new Set([...sessionDates, ...stepGoalDates]);
  const checkinWeeks = {};
  checkedDates.forEach((d) => {
    const wk = weekMonday(d);
    checkinWeeks[wk] = (checkinWeeks[wk] || 0) + 1;
  });
  const achievements = [
    { name: "On the board", note: "Complete one check-in", unlocked: checkedDates.size >= 1 },
    { name: "Mindful rep", note: "Take a mindful pause", unlocked: pauseDates.size >= 1 },
    { name: "Dinner ahead", note: "Decide dinner on 3 days", unlocked: dinnerDates.size >= 3 },
    { name: "Three-day pattern", note: "Move intentionally on 3 days", unlocked: movementDates.size >= 3 },
    { name: "Weekend switch", note: "Log movement on Saturday or Sunday", unlocked: [...movementDates].some((d) => dowIndex(d) >= 5) },
    { name: "Anchor week", note: "Check in on 5 days in one week", unlocked: Object.values(checkinWeeks).some((n) => n >= 5) },
  ];

  return {
    total, level, levelPoints, todayPoints, days, quests, achievements,
    week: {
      checkins: thisWeek(checkedDates),
      movement: thisWeek(movementDates),
      dinners: thisWeek(dinnerDates),
    },
  };
}

function progressBar(value, max, label) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  return `<div class="progress-track" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.min(value, max)}">
    <span style="width:${pct}%"></span>
  </div>`;
}

/* ---------- sync (private data repo) ---------- */
function syncConfig() {
  try { return JSON.parse(localStorage.getItem("baseline-sync") || "{}"); } catch { return {}; }
}
function saveSyncConfig(cfg) { localStorage.setItem("baseline-sync", JSON.stringify(cfg)); }

async function fetchSyncFile(name) {
  const cfg = syncConfig();
  if (cfg.pat && cfg.owner && cfg.repo) {
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${name}`, {
      headers: { Authorization: `Bearer ${cfg.pat}`, Accept: "application/vnd.github.raw+json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    return res.json();
  }
  // dev fallback: the sync JSONs served alongside the app on the PC
  const res = await fetch(`../data/sync/${name}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

async function syncNow(quiet = false) {
  let changed = false;
  const notes = [];
  try {
    const g = await fetchSyncFile("garmin_daily.json");
    for (const [d, steps] of Object.entries(g.steps || {})) {
      await DB.put("kv", { key: "steps:" + d, value: steps });
    }
    for (const w of g.weights || []) {
      const existing = await DB.get("weights", w.date);
      if (existing && existing.source === "manual") continue; // manual wins
      await DB.put("weights", { date: w.date, lbs: w.lbs, source: "garmin" });
    }
    if (Object.keys(g.steps || {}).length) { changed = true; notes.push("Garmin"); }
  } catch { notes.push("Garmin data unreachable"); }
  try {
    const m = await fetchSyncFile("meals.json");
    const hash = JSON.stringify(m.meals || []);
    const seen = await DB.get("kv", "lastMealsHash");
    if (m.meals && m.meals.length && (!seen || seen.value !== hash)) {
      const wk = weekMonday();
      const existing = await DB.get("mealweek", wk);
      const old = existing ? existing.meals : [];
      const meals = m.meals.map((name) => {
        const prev = old.find((x) => x.name === name);
        return { name, cooked: prev ? prev.cooked : false };
      });
      let tonight = null;
      if (existing && existing.tonight != null && existing.meals[existing.tonight]) {
        const keep = meals.findIndex((x) => x.name === existing.meals[existing.tonight].name);
        tonight = keep >= 0 ? keep : null;
      }
      await DB.put("mealweek", { weekOf: wk, meals, tonight });
      await DB.put("kv", { key: "lastMealsHash", value: hash });
      changed = true; notes.push("meal week updated");
    }
  } catch { /* no meals published yet — fine */ }
  await DB.put("kv", { key: "lastSync", value: new Date().toISOString() });
  if (changed) show(activeTab);
  if (!quiet) toast(changed ? "Synced — " + notes.join(", ") : "Synced — nothing new");
  return changed;
}

/* ---------- push notifications ---------- */
const VAPID_PUBLIC_KEY = "BNMHh-l5yP2Uj-2elH5pgPJENpjze1S_7SU-h4W2E7q5szxgpE1-B5N3YIbxoiT3-Nls1dncfDcOAlaT6eFGlx8";

function b64ToUint8(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function putSyncFile(name, obj) {
  const cfg = syncConfig();
  if (!cfg.pat) throw new Error("Set the sync token first");
  const api = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${name}`;
  const headers = { Authorization: `Bearer ${cfg.pat}`, Accept: "application/vnd.github+json" };
  let sha;
  const probe = await fetch(api, { headers, cache: "no-store" });
  if (probe.ok) sha = (await probe.json()).sha;
  const body = {
    message: `app: update ${name}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 1)))),
  };
  if (sha) body.sha = sha;
  const res = await fetch(api, { method: "PUT", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} — the token likely needs read-and-write Contents access`);
}

async function enableNotifications() {
  if (!("Notification" in window) || !("PushManager" in window)) {
    toast("Push isn't available here. On the iPhone, use the home-screen app.");
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") { toast("Notifications stay off until allowed"); return; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToUint8(VAPID_PUBLIC_KEY),
    });
    await putSyncFile("subscription.json", sub.toJSON());
    await DB.put("kv", { key: "pushEndpoint", value: sub.endpoint });
    toast("Nudges on — morning, lunch, dinner");
  } catch (err) {
    toast("Could not finish setup: " + err.message);
  }
}

/* iOS occasionally rotates subscriptions — keep the stored one current. */
async function refreshPushSubscription() {
  try {
    if (!("PushManager" in window) || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const cached = await DB.get("kv", "pushEndpoint");
    if (!cached || cached.value !== sub.endpoint) {
      await putSyncFile("subscription.json", sub.toJSON());
      await DB.put("kv", { key: "pushEndpoint", value: sub.endpoint });
    }
  } catch { /* quiet — retried next open */ }
}

/* ---------- sheet (modal) ---------- */
function openSheet(html) {
  $("#sheet").innerHTML = html;
  $("#sheetBackdrop").classList.add("open");
  return $("#sheet");
}
function closeSheet() {
  $("#sheetBackdrop").classList.remove("open");
}
$("#sheetBackdrop").addEventListener("click", (e) => {
  if (e.target.id === "sheetBackdrop") closeSheet();
});

/* ---------- tabs ---------- */
const RENDER = {};
let activeTab = "today";
async function show(tab) {
  activeTab = tab;
  $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + tab));
  await RENDER[tab]();
}
$$(".tabs button").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));

/* ============================================================
   TODAY
   ============================================================ */
RENDER.today = async function () {
  const view = $("#view-today");
  const date = todayISO();
  const weights = await sortedWeights();
  const last = weights[weights.length - 1] || null;
  const rate = trendPerWeek(weights);
  const checkin = (await DB.get("checkins", date)) || { date };
  const sessionsToday = (await DB.all("sessions")).filter((s) => s.date === date);
  const stepsRow = await DB.get("kv", "steps:" + date);
  const mw = await DB.get("mealweek", weekMonday());
  const dinnerToday = await DB.get("kv", "dinner:" + date);
  const tonight = dinnerToday ? dinnerToday.value : tonightMeal(mw);
  const lastDinner = await DB.get("kv", "dinner:" + addDays(date, -1));
  const mealsLogged = (await DB.all("meallog")).filter((m) => m.date === date);
  const plan = weekPlan();
  const todaySlot = plan.find((p) => p.day === dowIndex(date));
  const dow = dowIndex(date);
  const showReview = dow === 6 || dow === 0; // Sun or Mon
  const game = SETTINGS.gameMode ? await gameSnapshot(date) : null;

  const chip = (name, val, cur) =>
    `<button class="chip ${cur === val ? "on" : ""}" data-ci="${name}" data-val="${val}">${val}</button>`;

  view.innerHTML = `
  ${showReview ? `<div id="reviewCard"></div>` : ""}

  ${game ? `
  <section class="momentum-hero" aria-labelledby="momentumTitle">
    <div class="momentum-main">
      <div class="level-orb" style="--level-progress:${game.levelPoints / LEVEL_SIZE * 360}deg">
        <span>LV</span><strong>${game.level}</strong>
      </div>
      <div class="momentum-copy">
        <p class="eyebrow">Today's momentum</p>
        <h2 id="momentumTitle">${esc(levelName(game.level))}</h2>
        <p>${game.todayPoints} points today <span aria-hidden="true">·</span> ${LEVEL_SIZE - game.levelPoints} to level ${game.level + 1}</p>
      </div>
      <div class="point-badge">${game.total}<span>total</span></div>
    </div>
    ${progressBar(game.levelPoints, LEVEL_SIZE, `Level ${game.level} progress`)}
    <div class="quest-head">
      <div><strong>Daily quest</strong><span>${game.quests.filter((q) => q.done).length} of ${game.quests.length} complete</span></div>
      <span class="quest-points">showing up earns points</span>
    </div>
    <div class="quest-list">
      ${game.quests.map((q) => `
        <article class="quest ${q.done ? "done" : ""}">
          <span class="quest-mark" aria-hidden="true">${q.done ? "✓" : "+" + q.points}</span>
          <div><strong>${esc(q.title)}</strong><span>${esc(q.text)}</span></div>
          ${q.done ? `<span class="quest-state">done</span>` :
            q.id === "pause" ? `<button class="quest-action" data-quest-pause>Mark pause</button>` :
            q.id === "move" ? `<button class="quest-action" data-quest-move>Open</button>` :
            `<button class="quest-action" data-quest-dinner>Choose</button>`}
        </article>`).join("")}
    </div>
    <p class="game-rule">Points reward noticing, planning, and logging. They never rank a meal or a number on the scale.</p>
  </section>` : ""}

  <div class="card">
    <h2>Weight <span class="sub">lb</span></h2>
    <div class="row">
      <input type="number" inputmode="decimal" step="0.1" min="80" max="500" id="wIn"
             placeholder="${last ? last.lbs.toFixed(1) : "e.g., 240.0"}">
      <button class="btn primary fit" id="wSave">Save</button>
    </div>
    <p class="trend-note">
      ${last ? `Last: <strong>${last.lbs.toFixed(1)}</strong> (${fmtNice(last.date)})` : "No entries yet"}
      ${rate !== null ? ` · 7-day trend ${rate > 0 ? "+" : ""}${rate.toFixed(1)} lb/wk` : ""}
    </p>
  </div>

  <div class="card" id="checkinCard">
    <h2>Check-in <span class="sub">a few taps, done</span></h2>
    <div class="chip-row"><span class="lbl">Meals today</span>
      ${chip("meals", "Regular", checkin.meals)}${chip("meals", "Mixed", checkin.meals)}${chip("meals", "Off", checkin.meals)}
    </div>
    <div class="chip-row"><span class="lbl">Dinner</span>
      ${chip("dinner", "Before 8:30", checkin.dinner)}${chip("dinner", "Later", checkin.dinner)}${chip("dinner", "Skipped", checkin.dinner)}
    </div>
    <div class="chip-row"><span class="lbl">Movement</span>
      ${chip("movement", "Session done", checkin.movement)}${chip("movement", "Some movement", checkin.movement)}${chip("movement", "Rest day", checkin.movement)}
    </div>
    <div class="row" style="margin-top:10px">
      <input type="text" id="winIn" placeholder="Add a win (optional) — e.g., took the stairs">
      <button class="btn secondary fit" id="winSave">Add</button>
    </div>
  </div>

  ${todaySlot ? `
  <div class="card" id="sessionCard">
    <h2>Today's session <span class="sub">${todaySlot.time}${todaySlot.optional ? " · optional" : ""}</span></h2>
    <div class="row">
      <div>${esc(LIBRARY[todaySlot.id].name)}</div>
      <button class="btn secondary fit" data-open-lib="${todaySlot.id}">How-to</button>
      <button class="btn primary fit" data-log-lib="${todaySlot.id}">Log it</button>
    </div>
    ${sessionsToday.length ? `<p class="hint">Logged today: ${sessionsToday.map((s) => `${esc(LIBRARY[s.kind] ? LIBRARY[s.kind].name : s.kind)} (${s.minutes} min)`).join(", ")}</p>` : ""}
    <button class="btn subtle" id="logOther" style="margin-top:8px">Did something else? Log it</button>
  </div>` : ""}

  <div class="card" id="mealCard">
    <h2>Meals today</h2>
    ${lastDinner ? `<p style="margin:4px 0">Lunch: leftovers — ${esc(lastDinner.value)}</p>` : ""}
    ${tonight
      ? `<p style="margin:4px 0">Tonight: <strong>${esc(tonight)}</strong>
           <button class="btn subtle fit" id="tonightChange" style="padding:2px 10px; font-size:12px">change</button></p>`
      : `<div class="chip-row"><span class="lbl">Which dinner tonight?</span>
           ${mw && mw.meals.length ? mw.meals.map((m, i) => m.cooked ? "" :
             `<button class="chip small" data-pick-tonight="${i}">${esc(m.name.length > 42 ? m.name.slice(0, 40) + "…" : m.name)}</button>`).join("") : ""}
           <button class="chip small" id="tonightOther">Other dinner…</button>
         </div>
         ${mw && mw.meals.length ? "" : `<p class="hint">Meal week arrives with sync, or paste one in the Meals tab.</p>`}`}
    ${mealsLogged.map((m) => `<p style="margin:4px 0" class="quiet">${esc(m.slot)}: ${esc(m.text)}
      <button class="btn subtle fit" data-del-meal="${m.id}" style="padding:2px 8px; font-size:12px">×</button></p>`).join("")}
    <div class="chip-row" style="margin-top:10px"><span class="lbl">Add anything else you ate</span>
      ${["Breakfast", "Lunch", "Snack", "Dinner"].map((s) =>
        `<button class="chip small ${s === defaultMealSlot() ? "on" : ""}" data-slot="${s}">${s}</button>`).join("")}
    </div>
    <div class="row">
      <input type="text" id="mealIn" placeholder="e.g., breakfast sandwich, tacos out…">
      <button class="btn secondary fit" id="mealAdd">Add</button>
    </div>
  </div>

  <div class="card">
    <h2>Steps <span class="sub">goal ${stepGoal().toLocaleString()}</span></h2>
    <div class="row">
      <div>${stepsRow ? Number(stepsRow.value).toLocaleString() : "—"}
        <span class="quiet" style="font-size:13px">${stepsRow ? "" : "no sync data yet"}</span></div>
      <button class="btn subtle fit" id="stepsEnter">Enter</button>
    </div>
  </div>`;

  // events
  const pauseQuest = $("[data-quest-pause]", view);
  if (pauseQuest) pauseQuest.addEventListener("click", async () => {
    await DB.put("kv", { key: `quest:${date}:pause`, value: true });
    toast("Mindful pause · +8 momentum");
    RENDER.today();
  });
  const dinnerQuest = $("[data-quest-dinner]", view);
  if (dinnerQuest) dinnerQuest.addEventListener("click", () => {
    $("#mealCard", view).scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const moveQuest = $("[data-quest-move]", view);
  if (moveQuest) moveQuest.addEventListener("click", () => {
    const target = $("#sessionCard", view);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    else openLogOther();
  });
  $("#wSave").addEventListener("click", async () => {
    const v = parseFloat($("#wIn").value);
    if (!v || v < 80 || v > 500) { toast("Enter a weight first"); return; }
    await DB.put("weights", { date, lbs: Math.round(v * 10) / 10, source: "manual" });
    toast("Trend check saved · +3 momentum");
    RENDER.today();
  });
  $$("[data-ci]", view).forEach((b) => b.addEventListener("click", async () => {
    const existing = (await DB.get("checkins", date)) || { date };
    const key = b.dataset.ci;
    const firstAnswer = !existing[key];
    existing[key] = existing[key] === b.dataset.val ? undefined : b.dataset.val;
    await DB.put("checkins", existing);
    if (firstAnswer && existing[key]) toast("Check-in noted · +4 momentum");
    RENDER.today();
  }));
  $("#winSave").addEventListener("click", async () => {
    const text = $("#winIn").value.trim();
    if (!text) return;
    await DB.put("wins", { date, text });
    $("#winIn").value = "";
    toast("Win noticed · +4 momentum");
  });
  $$("[data-pick-tonight]", view).forEach((b) => b.addEventListener("click", async () => {
    mw.tonight = Number(b.dataset.pickTonight);
    await DB.put("mealweek", mw);
    await DB.put("kv", { key: "dinner:" + date, value: mw.meals[mw.tonight].name });
    toast("Dinner decided · +5 momentum");
    RENDER.today();
  }));
  const tonightOther = $("#tonightOther");
  if (tonightOther) tonightOther.addEventListener("click", async () => {
    const text = prompt("What's for dinner tonight? (an audible or eating out counts the same)");
    if (!text || !text.trim()) return;
    await DB.put("kv", { key: "dinner:" + date, value: text.trim() });
    if (mw) { mw.tonight = null; await DB.put("mealweek", mw); }
    toast("Dinner decided · +5 momentum");
    RENDER.today();
  });
  const tonightChange = $("#tonightChange");
  if (tonightChange) tonightChange.addEventListener("click", async () => {
    await DB.del("kv", "dinner:" + date);
    if (mw) { mw.tonight = null; await DB.put("mealweek", mw); }
    RENDER.today();
  });
  let mealSlot = defaultMealSlot();
  $$("[data-slot]", view).forEach((b) => b.addEventListener("click", () => {
    mealSlot = b.dataset.slot;
    $$("[data-slot]", view).forEach((x) => x.classList.toggle("on", x === b));
  }));
  $("#mealAdd").addEventListener("click", async () => {
    const text = $("#mealIn").value.trim();
    if (!text) return;
    await DB.put("meallog", { date, slot: mealSlot, text });
    toast("Meal noted · +2 momentum");
    RENDER.today();
  });
  $$("[data-del-meal]", view).forEach((b) => b.addEventListener("click", async () => {
    await DB.del("meallog", Number(b.dataset.delMeal));
    RENDER.today();
  }));
  $("#stepsEnter").addEventListener("click", async () => {
    const v = prompt("Steps today (from the watch or Garmin app):");
    const n = parseInt(v, 10);
    if (n > 0) { await DB.put("kv", { key: "steps:" + date, value: n }); RENDER.today(); }
  });
  wireLibButtons(view);
  const logOther = $("#logOther");
  if (logOther) logOther.addEventListener("click", openLogOther);

  if (showReview) renderReviewCard();
};

/* Log whatever actually happened — the plan is a suggestion, the log is truth. */
function openLogOther() {
  const sheet = openSheet(`
    <h2>Log a session</h2>
    <p class="hint" style="margin-top:0">Whatever you actually did counts the same as the plan.</p>
    ${Object.entries(LIBRARY).map(([id, x]) =>
      `<div class="lib-item" data-log-pick="${id}"><span>${esc(x.name)}</span><span class="mins">~${x.minutes} min</span></div>`).join("")}
    <div class="row" style="margin-top:14px">
      <input type="text" id="otherAct" placeholder="Something else — kayaking, mowing, dancing…">
      <input type="number" id="otherMin" inputmode="numeric" value="30" min="1" max="600" style="max-width:92px">
    </div>
    <p class="hint" style="margin:4px 0 0">Name and minutes, then log.</p>
    <div class="close-row">
      <button class="btn primary" id="otherLog">Log it</button>
      <button class="btn subtle" id="sheetClose" style="margin-left:8px">Cancel</button>
    </div>`);
  $("#sheetClose", sheet).addEventListener("click", closeSheet);
  $$("[data-log-pick]", sheet).forEach((el) => el.addEventListener("click", () => {
    closeSheet();
    openLogSession(el.dataset.logPick);
  }));
  $("#otherLog", sheet).addEventListener("click", async () => {
    const text = $("#otherAct").value.trim();
    if (!text) { toast("Name the activity first"); return; }
    const minutes = parseInt($("#otherMin").value, 10) || 30;
    await DB.put("sessions", { date: todayISO(), kind: text, minutes });
    closeSheet();
    toast("Movement logged · +15 momentum");
    if (activeTab === "today") RENDER.today();
  });
}

function defaultMealSlot() {
  const hr = new Date().getHours() + new Date().getMinutes() / 60;
  if (hr < 10.5) return "Breakfast";
  if (hr < 14.5) return "Lunch";
  if (hr < 17) return "Snack";
  if (hr < 21) return "Dinner";
  return "Snack";
}

function tonightMeal(mw) {
  // Only what Anthony actually picked — never assume an order.
  if (!mw || !mw.meals || !mw.meals.length) return null;
  if (mw.tonight != null && mw.meals[mw.tonight]) return mw.meals[mw.tonight].name;
  return null;
}

/* ---------- weekly review ---------- */
async function renderReviewCard() {
  const host = $("#reviewCard");
  if (!host) return;
  const today = todayISO();
  const dow = dowIndex(today);
  // Sunday: review the week ending today. Monday: the week that just ended.
  const weekStart = dow === 6 ? weekMonday(today) : addDays(weekMonday(today), -7);
  const weekEnd = addDays(weekStart, 6);
  const inWeek = (d) => d >= weekStart && d <= weekEnd;

  const sessions = (await DB.all("sessions")).filter((s) => inWeek(s.date));
  const checkins = (await DB.all("checkins")).filter((c) => inWeek(c.date) && (c.meals || c.dinner || c.movement));
  const weights = await sortedWeights();
  const rate = trendPerWeek(weights);

  const upcomingWeek = weekMonday(today) === weekStart ? addDays(weekStart, 7) : weekMonday(today);
  const overrideRow = await DB.get("kv", "plan-override:" + upcomingWeek);
  const chosen = overrideRow ? overrideRow.value : [];
  const morningDays = weekPlan().filter((p) => p.time === "morning").map((p) => p.day);

  host.innerHTML = `
  <div class="card" style="border-color: var(--accent)">
    <h2>Week in review <span class="sub">${fmtNice(weekStart)} – ${fmtNice(weekEnd)}</span></h2>
    <p style="margin:6px 0">${COPY.reviewSessions(sessions.length)}</p>
    <p style="margin:6px 0">${COPY.checkinLine(checkins.length)} ${COPY.trendLine(rate)}</p>
    <div class="chip-row"><span class="lbl">Mornings for the coming week</span>
      ${DOW.map((d, i) => `<button class="chip small ${chosen.includes(i) ? "on" : ""} ${morningDays.includes(i) ? "" : ""}"
        data-pick-day="${i}">${d}</button>`).join("")}
    </div>
    <p class="hint">Tap the mornings you intend to use. This adjusts emphasis, nothing else.</p>
  </div>`;

  $$("[data-pick-day]", host).forEach((b) => b.addEventListener("click", async () => {
    const i = Number(b.dataset.pickDay);
    const idx = chosen.indexOf(i);
    if (idx >= 0) chosen.splice(idx, 1); else chosen.push(i);
    await DB.put("kv", { key: "plan-override:" + upcomingWeek, value: chosen });
    renderReviewCard();
  }));
}

/* ============================================================
   MOVE
   ============================================================ */
function weekPlan(date = todayISO()) {
  return WEEK_TEMPLATES[scheduleMode(date)];
}

RENDER.move = async function () {
  const view = $("#view-move");
  const today = todayISO();
  const mode = scheduleMode(today);
  const plan = weekPlan(today);
  const wkStart = weekMonday(today);
  const overrideRow = await DB.get("kv", "plan-override:" + wkStart);
  const chosen = overrideRow ? overrideRow.value : null;

  view.innerHTML = `
  <div class="card">
    <h2>This week <span class="sub">${mode === "summer" ? "summer schedule (internship Wed/Thu)" : "school-year schedule"}</span></h2>
    ${plan.map((p) => {
      const isToday = p.day === dowIndex(today);
      const softened = chosen && p.time === "morning" && !chosen.includes(p.day);
      const opt = p.optional || softened;
      return `<div class="day-row ${isToday ? "today-row" : ""} ${opt ? "opt" : ""}" data-open-lib="${p.id}">
        <span class="dow">${DOW[p.day]}</span>
        <span class="what">${esc(LIBRARY[p.id].name)}
          <span class="when">${p.time}${opt ? " · optional" : ""}${chosen && chosen.includes(p.day) && p.time === "morning" ? " · planned" : ""}</span>
        </span>
        <span class="quiet">›</span>
      </div>`;
    }).join("")}
    <p class="hint">Tap a day for the how-to. Nothing here is ever marked missed.</p>
  </div>

  <div class="card">
    <h2>Library</h2>
    ${Object.entries(LIBRARY).map(([id, x]) =>
      `<div class="lib-item" data-open-lib="${id}">
         <span>${esc(x.name)}</span><span class="mins">~${x.minutes} min</span>
       </div>`).join("")}
  </div>

  <div class="card">
    <h2>Interval timer</h2>
    <p class="hint" style="margin-top:0">For circuits, run intervals, or anything work/rest.</p>
    <button class="btn primary" id="hiitOpen">Set up timer</button>
  </div>`;

  wireLibButtons(view);
  $("#hiitOpen").addEventListener("click", () => openTimerSetup());
};

/* library detail sheet */
function wireLibButtons(root) {
  $$("[data-open-lib]", root).forEach((el) =>
    el.addEventListener("click", () => openLibDetail(el.dataset.openLib)));
  $$("[data-log-lib]", root).forEach((el) =>
    el.addEventListener("click", (e) => { e.stopPropagation(); openLogSession(el.dataset.logLib); }));
}

function openLibDetail(id) {
  const x = LIBRARY[id];
  const sheet = openSheet(`
    <h2>${esc(x.name)}</h2>
    <p class="hint" style="margin-top:0">${esc(x.blurb)}</p>
    ${x.phases ? x.phases.map((ph, i) => `
      <div class="card" style="margin:10px 0">
        <h2>${esc(ph.name)}</h2>
        <p style="margin:4px 0 8px"><strong>${esc(ph.session)}</strong></p>
        <ul>${ph.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
        ${ph.timer ? `<button class="btn secondary" data-phase-timer="${i}">Start this as a timer</button>` : ""}
      </div>`).join("") : ""}
    ${x.exercises && x.exercises.length ? x.exercises.map((e) => {
      const name = e.split(" — ")[0];
      const guide = EXERCISE_GUIDE[name];
      if (!guide) return `<div style="padding:8px 4px; border-bottom:1px solid var(--border); font-size:14.5px">${esc(e)}</div>`;
      return `<details style="border-bottom:1px solid var(--border); padding:4px 0">
        <summary style="font-size:14.5px; color:var(--ink); padding:6px 4px">${esc(e)} <span class="quiet" style="font-size:12.5px">· how-to</span></summary>
        ${guide.what ? `<p class="hint" style="margin:4px 0 6px">${esc(guide.what)}</p>` : ""}
        <ul style="margin:4px 0">${guide.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        ${guide.cues ? `<ul class="quiet" style="margin:4px 0 8px">${guide.cues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
      </details>`;
    }).join("") : ""}
    ${x.notes && x.notes.length ? `<ul class="quiet">${x.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    <div class="close-row">
      <button class="btn primary" data-log-lib-sheet="${id}">Log this session</button>
      <button class="btn subtle" id="sheetClose" style="margin-left:8px">Close</button>
    </div>`);
  $("#sheetClose", sheet).addEventListener("click", closeSheet);
  $$("[data-phase-timer]", sheet).forEach((b) => b.addEventListener("click", () => {
    const t = x.phases[Number(b.dataset.phaseTimer)].timer;
    closeSheet();
    startTimer({ ...t, sessionKind: id });
  }));
  $$("[data-log-lib-sheet]", sheet).forEach((b) => b.addEventListener("click", () => {
    closeSheet();
    openLogSession(id);
  }));
}

function openLogSession(id) {
  const x = LIBRARY[id];
  const sheet = openSheet(`
    <h2>Log — ${esc(x.name)}</h2>
    <div class="row" style="margin-top:10px">
      <input type="number" inputmode="numeric" id="logMin" value="${x.minutes}" min="1" max="600">
      <span class="fit quiet">minutes</span>
    </div>
    <div class="close-row">
      <button class="btn primary" id="logGo">Log it</button>
      <button class="btn subtle" id="sheetClose" style="margin-left:8px">Cancel</button>
    </div>`);
  $("#sheetClose", sheet).addEventListener("click", closeSheet);
  $("#logGo", sheet).addEventListener("click", async () => {
    const minutes = parseInt($("#logMin").value, 10) || x.minutes;
    await DB.put("sessions", { date: todayISO(), kind: id, minutes });
    closeSheet();
    toast("Movement logged · +15 momentum");
    if (activeTab === "today") RENDER.today();
  });
}

/* ============================================================
   HIIT / interval timer
   ============================================================ */
let audioCtx = null;
function beep(freq = 880, ms = 160, count = 1) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < count; i++) {
      const t0 = audioCtx.currentTime + i * (ms / 1000 + 0.08);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain).connect(audioCtx.destination);
      gain.gain.setValueAtTime(0.25, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + ms / 1000);
      osc.start(t0); osc.stop(t0 + ms / 1000 + 0.02);
    }
  } catch { /* audio unavailable — timer still works */ }
}

let wakeLock = null;
async function grabWakeLock() {
  try { wakeLock = await navigator.wakeLock.request("screen"); } catch { wakeLock = null; }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && $("#timerOverlay").classList.contains("open")) grabWakeLock();
});

const TIMER = { seq: [], idx: 0, endAt: 0, remainMs: 0, running: false, iv: null, sessionKind: null, startedAt: null };

function buildSequence(cfg) {
  const seq = [];
  if (cfg.prep) seq.push({ label: "Ready", secs: cfg.prep, kind: "prep" });
  for (let r = 1; r <= cfg.rounds; r++) {
    seq.push({ label: cfg.workLabel || "Work", secs: cfg.work, kind: "work", round: r });
    if (cfg.rest && r < cfg.rounds) seq.push({ label: cfg.restLabel || "Rest", secs: cfg.rest, kind: "rest", round: r });
  }
  return seq;
}

function openTimerSetup() {
  const sheet = openSheet(`
    <h2>Interval timer</h2>
    <div class="row" style="margin-top:10px">
      <div><span class="quiet" style="font-size:13px">Work (sec)</span><input type="number" id="tWork" value="40" min="5"></div>
      <div><span class="quiet" style="font-size:13px">Rest (sec)</span><input type="number" id="tRest" value="20" min="0"></div>
      <div><span class="quiet" style="font-size:13px">Rounds</span><input type="number" id="tRounds" value="8" min="1"></div>
    </div>
    <div class="close-row">
      <button class="btn primary" id="tStart">Start</button>
      <button class="btn subtle" id="sheetClose" style="margin-left:8px">Cancel</button>
    </div>`);
  $("#sheetClose", sheet).addEventListener("click", closeSheet);
  $("#tStart", sheet).addEventListener("click", () => {
    const cfg = {
      prep: 10,
      work: parseInt($("#tWork").value, 10) || 40,
      rest: parseInt($("#tRest").value, 10) || 0,
      rounds: parseInt($("#tRounds").value, 10) || 1,
    };
    closeSheet();
    startTimer(cfg);
  });
}

function startTimer(cfg) {
  TIMER.seq = buildSequence(cfg);
  TIMER.idx = 0;
  TIMER.sessionKind = cfg.sessionKind || null;
  TIMER.startedAt = Date.now();
  $("#timerOverlay").classList.add("open");
  grabWakeLock();
  beep(660, 120, 1); // arm audio on the user gesture
  enterPhase(0);
  TIMER.iv = setInterval(tickTimer, 200);
}
function enterPhase(i) {
  TIMER.idx = i;
  const ph = TIMER.seq[i];
  TIMER.endAt = Date.now() + ph.secs * 1000;
  TIMER.running = true;
  const total = TIMER.seq.filter((p) => p.kind === "work").length;
  $("#timerPhase").textContent = ph.label;
  $("#timerRound").textContent = ph.round ? `Round ${ph.round} of ${total}` : "";
  $("#timerOverlay").classList.toggle("work", ph.kind === "work");
  if (ph.kind === "work") beep(880, 160, 2);
  else if (ph.kind === "rest") beep(440, 200, 1);
}
function tickTimer() {
  if (!TIMER.running) return;
  const ms = TIMER.endAt - Date.now();
  if (ms <= 0) {
    if (TIMER.idx + 1 < TIMER.seq.length) enterPhase(TIMER.idx + 1);
    else finishTimer();
    return;
  }
  const s = Math.ceil(ms / 1000);
  $("#timerClock").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function finishTimer() {
  beep(880, 180, 3);
  stopTimerUI();
  const minutes = Math.max(1, Math.round((Date.now() - TIMER.startedAt) / 60000));
  const kind = TIMER.sessionKind;
  const sheet = openSheet(`
    <h2>Done</h2>
    <p class="hint">${minutes} minute${minutes === 1 ? "" : "s"} on the clock.</p>
    <div class="close-row">
      <button class="btn primary" id="tLog">Log as a session</button>
      <button class="btn subtle" id="sheetClose" style="margin-left:8px">Close</button>
    </div>`);
  $("#sheetClose", sheet).addEventListener("click", closeSheet);
  $("#tLog", sheet).addEventListener("click", async () => {
    await DB.put("sessions", { date: todayISO(), kind: kind || "intervals", minutes });
    closeSheet();
    toast("Movement logged · +15 momentum");
    if (activeTab === "today") RENDER.today();
  });
}
function stopTimerUI() {
  clearInterval(TIMER.iv);
  TIMER.running = false;
  $("#timerOverlay").classList.remove("open", "work");
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
$("#timerPause").addEventListener("click", () => {
  if (TIMER.running) {
    TIMER.remainMs = TIMER.endAt - Date.now();
    TIMER.running = false;
    $("#timerPause").textContent = "Resume";
  } else {
    TIMER.endAt = Date.now() + TIMER.remainMs;
    TIMER.running = true;
    $("#timerPause").textContent = "Pause";
  }
});
$("#timerStop").addEventListener("click", () => { stopTimerUI(); $("#timerPause").textContent = "Pause"; });

/* ============================================================
   MEALS
   ============================================================ */
function parseMealDoc(text) {
  const lines = String(text).split(/\r?\n/);
  let meals = [];
  let inMealSection = false;
  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.*)/);
    if (h) { inMealSection = /meal/i.test(h[1]); continue; }
    if (inMealSection) {
      const m = line.match(/^\s{0,3}\d+\.\s+(.*)/);
      if (m) meals.push(m[1].trim());
    }
  }
  if (!meals.length) {
    for (const line of lines) {
      const m = line.match(/^\d+\.\s+(.*)/);
      if (m) meals.push(m[1].trim());
    }
  }
  return meals;
}

RENDER.meals = async function () {
  const view = $("#view-meals");
  const wk = weekMonday();
  const mw = await DB.get("mealweek", wk);
  const t = SETTINGS.mealTimes;

  view.innerHTML = `
  <div class="card">
    <h2>This week's dinners <span class="sub">week of ${fmtNice(wk)}</span></h2>
    ${mw && mw.meals.length ? mw.meals.map((m, i) => `
      <div class="meal-row">
        <input type="checkbox" data-cooked="${i}" ${m.cooked ? "checked" : ""}>
        <span class="name ${m.cooked ? "done" : ""}">${esc(m.name)}</span>
        ${mw.tonight === i ? `<span class="tonight-tag">tonight</span>` : `<button class="btn subtle fit" data-tonight="${i}">Tonight</button>`}
      </div>`).join("")
    : `<p class="hint" style="margin-top:0">Nothing imported for this week yet.</p>`}
    <div style="margin-top:12px">
      <button class="btn primary" id="importMeals">Import week</button>
    </div>
  </div>

  <div class="card">
    <h2>Meal anchors <span class="sub">regular beats perfect</span></h2>
    <p style="margin:4px 0">Breakfast around <strong>${esc(t.breakfast)}</strong> · lunch around <strong>${esc(t.lunch)}</strong> · dinner by <strong>${esc(t.dinnerBy)}</strong></p>
    <p class="hint">Editable in settings. Reminders arrive with the notification round.</p>
  </div>`;

  $("#importMeals").addEventListener("click", openMealImport);
  $$("[data-cooked]", view).forEach((cb) => cb.addEventListener("change", async () => {
    mw.meals[Number(cb.dataset.cooked)].cooked = cb.checked;
    await DB.put("mealweek", mw);
    RENDER.meals();
  }));
  $$("[data-tonight]", view).forEach((b) => b.addEventListener("click", async () => {
    mw.tonight = Number(b.dataset.tonight);
    await DB.put("mealweek", mw);
    await DB.put("kv", { key: "dinner:" + todayISO(), value: mw.meals[mw.tonight].name });
    toast("Dinner decided · +5 momentum");
    RENDER.meals();
  }));
};

function openMealImport() {
  const sheet = openSheet(`
    <h2>Import the week's meals</h2>
    <p class="hint" style="margin-top:0">Paste the weekly meal plan or grocery handoff markdown. The numbered meal list gets picked out automatically.</p>
    <textarea id="mealPaste" placeholder="# Harris Teeter Handoff …&#10;## Final Meal Set&#10;1. …"></textarea>
    <div class="close-row">
      <button class="btn primary" id="mealParse">Import</button>
      <button class="btn subtle" id="sheetClose" style="margin-left:8px">Cancel</button>
    </div>`);
  $("#sheetClose", sheet).addEventListener("click", closeSheet);
  $("#mealParse", sheet).addEventListener("click", async () => {
    const meals = parseMealDoc($("#mealPaste").value);
    if (!meals.length) { toast("No numbered meal list found in that text"); return; }
    await DB.put("mealweek", {
      weekOf: weekMonday(),
      meals: meals.map((name) => ({ name, cooked: false })),
      tonight: null,
    });
    closeSheet();
    toast(`Imported ${meals.length} meals`);
    RENDER.meals();
  });
}

/* ============================================================
   TRENDS
   ============================================================ */
let trendRange = 365; // 30 | 365 | 0 (all)

RENDER.trends = async function () {
  const view = $("#view-trends");
  const weights = await sortedWeights();
  const rate = trendPerWeek(weights);
  const wins = (await DB.all("wins")).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 20);
  const checkins = await DB.all("checkins");
  const now = todayISO();
  const within = (d, days) => d >= addDays(now, -days + 1);
  const c7 = checkins.filter((c) => within(c.date, 7) && (c.meals || c.dinner || c.movement)).length;
  const c28 = checkins.filter((c) => within(c.date, 28) && (c.meals || c.dinner || c.movement)).length;
  const game = SETTINGS.gameMode ? await gameSnapshot(now) : null;
  const recentGameDays = Array.from({ length: 7 }, (_, i) => addDays(now, i - 6));

  view.innerHTML = `
  ${game ? `
  <div class="card game-card">
    <div class="game-card-head">
      <div>
        <p class="eyebrow">Momentum</p>
        <h2>Level ${game.level} <span class="sub">${esc(levelName(game.level))}</span></h2>
      </div>
      <strong class="game-total">${game.total}<span>points</span></strong>
    </div>
    ${progressBar(game.levelPoints, LEVEL_SIZE, `Level ${game.level} progress`)}
    <div class="seven-day" aria-label="Momentum points for the last seven days">
      ${recentGameDays.map((d) => {
        const pts = game.days[d] ? game.days[d].points : 0;
        return `<div class="day-pip ${pts ? "active" : ""}"><span>${DOW[dowIndex(d)].slice(0, 1)}</span><i style="--pip:${Math.max(12, Math.min(100, pts / 45 * 100))}%"></i><strong>${pts}</strong></div>`;
      }).join("")}
    </div>
  </div>

  <div class="card">
    <h2>This week's campaign <span class="sub">small targets, all independent</span></h2>
    <div class="campaign-row"><div><strong>Check in</strong><span>${game.week.checkins} / 5 days</span></div>${progressBar(game.week.checkins, 5, "Weekly check-ins")}</div>
    <div class="campaign-row"><div><strong>Move intentionally</strong><span>${game.week.movement} / 3 days</span></div>${progressBar(game.week.movement, 3, "Weekly movement")}</div>
    <div class="campaign-row"><div><strong>Decide dinner</strong><span>${game.week.dinners} / 4 days</span></div>${progressBar(game.week.dinners, 4, "Weekly dinner decisions")}</div>
  </div>

  <div class="card">
    <h2>Milestones <span class="sub">${game.achievements.filter((a) => a.unlocked).length} unlocked</span></h2>
    <div class="badge-grid">
      ${game.achievements.map((a) => `<div class="badge-tile ${a.unlocked ? "unlocked" : ""}">
        <span class="badge-icon" aria-hidden="true">${a.unlocked ? "◆" : "◇"}</span>
        <strong>${esc(a.name)}</strong><span>${esc(a.note)}</span>
      </div>`).join("")}
    </div>
  </div>` : ""}

  <div class="card">
    <h2>Weight</h2>
    <div class="chip-row">
      ${[["30 days", 30], ["12 months", 365], ["All", 0]].map(([lbl, v]) =>
        `<button class="chip small ${trendRange === v ? "on" : ""}" data-range="${v}">${lbl}</button>`).join("")}
    </div>
    <canvas class="chart" id="wChart"></canvas>
    <p class="trend-note">${COPY.trendLine(rate)}
      ${paceLine(weights, rate)}
      ${weights.length ? ` · ${weights.length.toLocaleString()} entries on record` : ""}</p>
  </div>

  ${SETTINGS.streaksOptIn ? `
  <div class="card">
    <h2>Consistency <span class="sub">rolling, nothing resets</span></h2>
    <p style="margin:4px 0">Checked in <strong>${c7} of the last 7</strong> days · ${c28} of the last 28</p>
  </div>` : ""}

  <div class="card">
    <h2>Wins</h2>
    ${wins.length ? wins.map((w) => `<div class="win-row"><span class="d">${fmtNice(w.date)}</span>${esc(w.text)}</div>`).join("")
      : `<p class="hint" style="margin-top:0">Log the first one from the Today tab. Small wins stay visible here.</p>`}
  </div>

  <div class="card">
    <h2>Steps <span class="sub">last 30 days · goal ${stepGoal().toLocaleString()}</span></h2>
    <canvas class="chart" id="sChart" style="height:150px"></canvas>
  </div>`;

  $$("[data-range]", view).forEach((b) => b.addEventListener("click", () => {
    trendRange = Number(b.dataset.range);
    RENDER.trends();
  }));
  drawWeightChart(weights);
  drawStepsChart(await stepHistory(30));
};

async function stepHistory(days) {
  const rows = (await DB.all("kv")).filter((r) => r.key.startsWith("steps:"));
  const map = Object.fromEntries(rows.map((r) => [r.key.slice(6), r.value]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(todayISO(), -i);
    out.push({ date: d, steps: map[d] ?? null });
  }
  return out;
}

function drawStepsChart(rows) {
  const canvas = $("#sChart");
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const vals = rows.filter((r) => r.steps !== null);
  if (!vals.length) {
    ctx.fillStyle = cssVar("--muted");
    ctx.font = "14px -apple-system, sans-serif";
    ctx.fillText("No step data yet — it arrives with sync.", 12, h / 2);
    return;
  }
  const goal = stepGoal();
  const hi = Math.max(goal, ...vals.map((r) => r.steps)) * 1.1;
  const PX = { l: 6, r: 6, t: 6, b: 16 };
  const bw = (w - PX.l - PX.r) / rows.length;
  ctx.fillStyle = cssVar("--border");
  rows.forEach((r, i) => {
    if (r.steps === null) return;
    const bh = (r.steps / hi) * (h - PX.t - PX.b);
    ctx.fillStyle = r.steps >= goal ? cssVar("--accent") : cssVar("--border");
    ctx.fillRect(PX.l + i * bw + 1, h - PX.b - bh, Math.max(1, bw - 2), bh);
  });
  // goal line
  const gy = h - PX.b - (goal / hi) * (h - PX.t - PX.b);
  ctx.strokeStyle = cssVar("--muted");
  ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(PX.l, gy); ctx.lineTo(w - PX.r, gy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = cssVar("--muted");
  ctx.font = "11px -apple-system, sans-serif";
  ctx.fillText(fmtNice(rows[0].date), PX.l, h - 4);
  const lastLbl = fmtNice(rows[rows.length - 1].date);
  ctx.fillText(lastLbl, w - PX.r - ctx.measureText(lastLbl).width, h - 4);
}

/* Projection shown only when the trend is flat-or-down: the "am I on
   track" math, done with real scale data rather than guessed calories. */
function paceLine(weights, rate) {
  if (rate === null || rate > 0.05 || weights.length < 6) return "";
  const today = todayISO();
  if (today >= SCHOOL_YEAR_START) return "";
  const ma = movingAvg(weights);
  const current = ma[ma.length - 1].ma;
  const weeks = (new Date(SCHOOL_YEAR_START) - new Date(today)) / (7 * 864e5);
  const projected = Math.round(current + rate * weeks);
  return ` If this holds: about ${projected} lb by school start (Aug 17).`;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function drawWeightChart(weights) {
  const canvas = $("#wChart");
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const now = todayISO();
  const rows = trendRange ? weights.filter((r) => r.date >= addDays(now, -trendRange + 1)) : weights;
  if (rows.length < 2) {
    ctx.fillStyle = cssVar("--muted");
    ctx.font = "14px -apple-system, sans-serif";
    ctx.fillText(rows.length ? "One entry so far. The line starts at two." : "No entries in this range.", 12, h / 2);
    return;
  }

  const ma = movingAvg(weights).filter((r) => rows.find((x) => x.date === r.date));
  const t0 = new Date(rows[0].date).getTime();
  const t1 = new Date(rows[rows.length - 1].date).getTime() || t0 + 1;
  let lo = Math.min(...rows.map((r) => r.lbs));
  let hi = Math.max(...rows.map((r) => r.lbs));
  const goal = SETTINGS.goalWeight;
  if (goal && goal > lo - 15 && goal < hi + 15) { lo = Math.min(lo, goal); hi = Math.max(hi, goal); }
  const pad = Math.max(2, (hi - lo) * 0.08);
  lo -= pad; hi += pad;

  const PX = { l: 34, r: 8, t: 8, b: 20 };
  const X = (d) => PX.l + (new Date(d).getTime() - t0) / (t1 - t0 || 1) * (w - PX.l - PX.r);
  const Y = (v) => PX.t + (hi - v) / (hi - lo) * (h - PX.t - PX.b);

  // y-axis labels
  ctx.fillStyle = cssVar("--muted");
  ctx.font = "11px -apple-system, sans-serif";
  for (const v of [lo + pad, (lo + hi) / 2, hi - pad]) {
    ctx.fillText(Math.round(v), 4, Y(v) + 4);
  }
  // x-axis: first + last date
  ctx.fillText(fmtNice(rows[0].date), PX.l, h - 6);
  const lastLbl = fmtNice(rows[rows.length - 1].date);
  ctx.fillText(lastLbl, w - PX.r - ctx.measureText(lastLbl).width, h - 6);

  // goal line
  if (goal && goal >= lo && goal <= hi) {
    ctx.strokeStyle = cssVar("--muted");
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(PX.l, Y(goal)); ctx.lineTo(w - PX.r, Y(goal));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // dots
  ctx.fillStyle = cssVar("--border");
  for (const r of rows) {
    ctx.beginPath();
    ctx.arc(X(r.date), Y(r.lbs), rows.length > 120 ? 1.6 : 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // smoothed line
  ctx.strokeStyle = cssVar("--accent");
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ma.forEach((r, i) => {
    const x = X(r.date), y = Y(r.ma);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

/* ============================================================
   SETTINGS
   ============================================================ */
$("#gearBtn").addEventListener("click", openSettings);

async function openSettings() {
  const t = SETTINGS.mealTimes;
  const sc = syncConfig();
  const lastSync = await DB.get("kv", "lastSync");
  const sheet = openSheet(`
    <h2>Settings</h2>

    <details class="settings-group" ${sc.pat ? "" : "open"}>
      <summary>Sync</summary>
      <p class="hint" style="margin:6px 0">Reads the private data repo your PC publishes to. The token needs read-only Contents access to that one repo, nothing else.</p>
      <div class="row" style="margin-bottom:8px">
        <div><span class="quiet" style="font-size:13px">GitHub owner</span><input type="text" id="syOwner" value="${esc(sc.owner || "aintfunny18-tech")}"></div>
        <div><span class="quiet" style="font-size:13px">Data repo</span><input type="text" id="syRepo" value="${esc(sc.repo || "baseline-data")}"></div>
      </div>
      <div><span class="quiet" style="font-size:13px">Fine-grained token</span>
        <input type="password" id="syPat" value="${esc(sc.pat || "")}" placeholder="github_pat_…" autocomplete="off"></div>
      <div class="row" style="margin-top:10px">
        <button class="btn secondary fit" id="sySyncNow">Sync now</button>
        <span class="quiet" style="font-size:13px">${lastSync ? "Last sync " + new Date(lastSync.value).toLocaleString() : "Never synced on this device"}</span>
      </div>
    </details>

    <details class="settings-group">
      <summary>Nudges</summary>
      <p class="hint" style="margin:6px 0">Three quiet daily notifications: morning (session + breakfast), lunch anchor, dinner window. Needs the home-screen app and a sync token with read-and-write Contents access.</p>
      <p class="hint" style="margin:6px 0">${("Notification" in window) ? "Permission: " + Notification.permission : "Not supported in this browser"}</p>
      <button class="btn secondary" id="sNotif">Enable on this device</button>
    </details>

    <details class="settings-group" open>
      <summary>Goal</summary>
      <div class="row"><div>
        <span class="quiet" style="font-size:13px">Goal weight (lb) — adjustable context, not a deadline</span>
        <input type="number" id="sGoal" value="${SETTINGS.goalWeight}">
      </div></div>
    </details>

    <details class="settings-group" open>
      <summary>Momentum game</summary>
      <label class="row" style="align-items:center">
        <input type="checkbox" id="sGame" ${SETTINGS.gameMode ? "checked" : ""} style="width:20px;height:20px;flex:0 0 auto;accent-color:var(--accent)">
        <span><strong>Show levels, daily quests, and milestones</strong><br><span class="hint">Points reward interaction and follow-through. Food choices and scale results are never scored.</span></span>
      </label>
    </details>

    <details class="settings-group">
      <summary>Meal anchors</summary>
      <div class="row">
        <div><span class="quiet" style="font-size:13px">Breakfast</span><input type="time" id="sBk" value="${t.breakfast}"></div>
        <div><span class="quiet" style="font-size:13px">Lunch</span><input type="time" id="sLu" value="${t.lunch}"></div>
        <div><span class="quiet" style="font-size:13px">Dinner by</span><input type="time" id="sDn" value="${t.dinnerBy}"></div>
      </div>
    </details>

    <details class="settings-group">
      <summary>Schedule & steps</summary>
      <div class="row" style="margin-bottom:8px"><div>
        <span class="quiet" style="font-size:13px">Schedule mode</span>
        <select id="sMode">
          <option value="auto" ${SETTINGS.scheduleMode === "auto" ? "selected" : ""}>Auto (school year from Aug 17)</option>
          <option value="summer" ${SETTINGS.scheduleMode === "summer" ? "selected" : ""}>Summer</option>
          <option value="school" ${SETTINGS.scheduleMode === "school" ? "selected" : ""}>School year</option>
        </select>
      </div></div>
      <div class="row">
        <div><span class="quiet" style="font-size:13px">Step goal start</span><input type="number" id="sStepStart" value="${SETTINGS.stepStart}"></div>
        <div><span class="quiet" style="font-size:13px">Ramp / week</span><input type="number" id="sStepRamp" value="${SETTINGS.stepRampPerWeek}"></div>
        <div><span class="quiet" style="font-size:13px">Cap</span><input type="number" id="sStepCap" value="${SETTINGS.stepCap}"></div>
      </div>
      <label class="row" style="margin-top:8px; align-items:center">
        <input type="checkbox" id="sStreaks" ${SETTINGS.streaksOptIn ? "checked" : ""} style="width:20px;height:20px;flex:0 0 auto;accent-color:var(--accent)">
        <span>Show the consistency card</span>
      </label>
    </details>

    <details class="settings-group">
      <summary>Data</summary>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px">
        <button class="btn secondary" id="sExport">Export backup</button>
        <button class="btn secondary" id="sImportBtn">Import backup</button>
        <button class="btn secondary" id="sGarminBtn">Import Garmin weights</button>
      </div>
      <input type="file" id="sImportFile" accept=".json,application/json" hidden>
      <input type="file" id="sGarminFile" accept=".json,application/json" hidden>
      <p class="hint">Garmin import reads body_composition.json from the data pull. Manual entries on the same date are kept.</p>
      <div style="margin-top:14px"><button class="danger-btn" id="sWipe">Erase all app data</button></div>
    </details>

    <div class="close-row">
      <button class="btn primary" id="sSave">Save</button>
      <button class="btn subtle" id="sheetClose" style="margin-left:8px">Close</button>
    </div>`);

  $("#sheetClose", sheet).addEventListener("click", closeSheet);
  $("#sNotif", sheet).addEventListener("click", async () => {
    saveSyncConfig({ owner: $("#syOwner").value.trim(), repo: $("#syRepo").value.trim(), pat: $("#syPat").value.trim() });
    await enableNotifications();
  });
  $("#sySyncNow", sheet).addEventListener("click", async () => {
    saveSyncConfig({ owner: $("#syOwner").value.trim(), repo: $("#syRepo").value.trim(), pat: $("#syPat").value.trim() });
    await syncNow();
  });
  $("#sSave", sheet).addEventListener("click", async () => {
    saveSyncConfig({ owner: $("#syOwner").value.trim(), repo: $("#syRepo").value.trim(), pat: $("#syPat").value.trim() });
    SETTINGS.goalWeight = parseFloat($("#sGoal").value) || SETTINGS.goalWeight;
    SETTINGS.mealTimes = { breakfast: $("#sBk").value, lunch: $("#sLu").value, dinnerBy: $("#sDn").value };
    SETTINGS.scheduleMode = $("#sMode").value;
    SETTINGS.stepStart = parseInt($("#sStepStart").value, 10) || SETTINGS.stepStart;
    SETTINGS.stepRampPerWeek = parseInt($("#sStepRamp").value, 10) || 0;
    SETTINGS.stepCap = parseInt($("#sStepCap").value, 10) || SETTINGS.stepCap;
    SETTINGS.streaksOptIn = $("#sStreaks").checked;
    SETTINGS.gameMode = $("#sGame").checked;
    await saveSettings();
    closeSheet();
    toast("Saved");
    show(activeTab);
  });

  $("#sExport", sheet).addEventListener("click", async () => {
    const payload = await DB.exportAll();
    download(`baseline-backup-${todayISO()}.json`, JSON.stringify(payload, null, 1), "application/json");
  });
  $("#sImportBtn", sheet).addEventListener("click", () => $("#sImportFile").click());
  $("#sImportFile", sheet).addEventListener("change", async (e) => {
    try {
      const n = await DB.importAll(JSON.parse(await e.target.files[0].text()));
      await loadSettings();
      toast(`Restored ${n} records`);
      show(activeTab);
    } catch (err) { toast("That file did not import: " + err.message); }
  });
  $("#sGarminBtn", sheet).addEventListener("click", () => $("#sGarminFile").click());
  $("#sGarminFile", sheet).addEventListener("change", async (e) => {
    try {
      const n = await importGarminWeights(e.target.files[0]);
      toast(`Imported ${n} weigh-ins from Garmin`);
      show(activeTab);
    } catch (err) { toast("That file did not import: " + err.message); }
  });
  $("#sWipe", sheet).addEventListener("click", async () => {
    if (!confirm("Erase everything this app has stored on this device?")) return;
    await DB.wipe();
    await loadSettings();
    closeSheet();
    toast("Cleared");
    show("today");
  });
}

async function importGarminWeights(file) {
  const data = JSON.parse(await file.text());
  const list = data.dateWeightList || [];
  if (!list.length) throw new Error("no dateWeightList found");
  let n = 0;
  for (const e of list) {
    const d = String(e.calendarDate || e.date || "").slice(0, 10);
    const grams = e.weight;
    if (!d || !grams) continue;
    const existing = await DB.get("weights", d);
    if (existing && existing.source === "manual") continue; // manual wins
    await DB.put("weights", { date: d, lbs: Math.round(grams / 453.592 * 10) / 10, source: "garmin" });
    n++;
  }
  return n;
}

/* ---------- boot ---------- */
(async function boot() {
  $("#todayDate").textContent = fmtNice(todayISO());
  await loadSettings();
  await show("today");
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  syncNow(true).catch(() => {}); // background refresh; quiet on failure
  refreshPushSubscription();
})();

/* Re-sync when the installed app wakes from the background (>30 min old). */
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  const last = await DB.get("kv", "lastSync");
  if (!last || Date.now() - new Date(last.value).getTime() > 30 * 60 * 1000) {
    syncNow(true).catch(() => {});
  }
});
