# Baseline Development Handoff

Last updated: 2026-07-10

## Current state

Baseline is a private, local-first fitness PWA with a behavior-based momentum
game. It is intentionally not a calorie tracker. The public application code
lives in this repository and deploys through GitHub Pages.

- Public site: https://aintfunny18-tech.github.io/baseline/
- Public repository: https://github.com/aintfunny18-tech/baseline
- Deployment source: `main`, repository root
- Runtime: vanilla HTML, CSS, and JavaScript; no build step or dependencies
- Primary device: iPhone home-screen PWA

The 2026-07-10 release adds levels, daily quests, weekly campaign tracks,
seven-day momentum history, and milestones. The game can be hidden in Settings
without changing or deleting any health records.

## Product rules

These are non-negotiable unless Anthony explicitly changes them.

1. Never count or display calories.
2. Never label foods as good, bad, clean, or cheating.
3. Never connect food intake to exercise as an offset or payment.
4. Never penalize missed days, rest days, late meals, or honest check-ins.
5. Reward attention, planning, consistency, and returning to the app.
6. Keep weight visible when requested, but frame the smoothed trend as the
   useful signal and 1-2 lb/week as the sustainable range.
7. Keep the app private by default and do not add social or partner visibility.
8. Prefer short, calm copy. No mascot energy, praise-bombing, or red failure
   states.

## Repository and privacy boundary

This checkout is nested at `fitness-app/app` and is its own Git repository. The
parent workspace contains private health data and support scripts; it is not
part of this public repository.

Never commit any of the following:

- The parent workspace's `data/` directory
- Garmin exports or generated health reports
- GitHub personal access tokens
- VAPID private keys or push subscription files
- The private `baseline-data` repository contents
- Exported IndexedDB backups

The public repository should contain application code, icons, and documentation
only. Sync credentials are entered on-device and stored in browser localStorage.

## File map

- `index.html` - app shell, metadata, tabs, sheets, and script loading
- `app.css` - visual system and responsive styling
- `app.js` - rendering, interactions, momentum game, sync, charts, and settings
- `content.js` - exercise library, schedules, and reviewed copy
- `db.js` - IndexedDB wrapper and backup/import behavior
- `manifest.json` - installable PWA metadata
- `sw.js` - offline shell cache, push handling, and update boundary
- `CHANGELOG.md` - user-visible release history
- `HANDOFF.md` - architecture, rules, release process, and current priorities

## Data model

IndexedDB database: `baseline-db`, currently version 2.

- `weights {date, lbs, source}`
- `checkins {date, meals, dinner, movement}`
- `wins {id, date, text}`
- `sessions {id, date, kind, minutes}`
- `mealweek {weekOf, meals[], tonight}`
- `meallog {id, date, slot, text}`
- `kv {key, value}` for settings, steps, dinner choices, quest state, and sync
  timestamps

Adding a new object store requires increasing the database version in `db.js`.
Additive settings and small keyed records should normally use `kv` instead.

## Momentum scoring

Scoring begins on `settings.firstUse`; old Garmin history does not create years
of retroactive points.

| Action | Points | Limit |
| --- | ---: | --- |
| Answer a check-in category | 4 | 12 per day across three categories |
| Log intentional movement | 15 | Once per day |
| Log a distinct meal slot | 2 | 8 per day |
| Record a weigh-in | 3 | Once per day |
| Notice a win | 4 | Once per day |
| Decide dinner | 5 | Once per day |
| Reach the current step target | 10 | Once per day |
| Mark a mindful pause | 8 | Once per day |

All values within a check-in category score equally. Do not introduce points for
losing weight, eating a particular food, skipping food, or exceeding an exercise
target. Level size is currently 80 points.

## Local development

Serve the parent workspace so the development fallback can reach
`data/sync/*.json`:

```powershell
cd <fitness-app-parent>
python -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000/app/`.

There is no compile step. Before a release:

1. Parse `app.js` with a modern JavaScript parser or load the app locally.
2. Confirm `manifest.json` is valid JSON.
3. Confirm every local asset referenced by `index.html` exists and serves.
4. Run `git diff --check`.
5. Review the diff for credentials, personal health data, or private paths.
6. Increment the cache name in `sw.js` whenever a shell asset changes.
7. Update `CHANGELOG.md` and the date/current-state section in this file.

## Deployment

GitHub Pages uses the root of `main` with the legacy Pages build. A push to
`main` triggers `pages-build-deployment` and updates the public URL.

```powershell
cd <baseline-repository>
git status -sb
git diff --check
git add <intentional files>
git commit -m "Describe the release"
git push origin main
gh api repos/aintfunny18-tech/baseline/pages
gh run list -R aintfunny18-tech/baseline --workflow pages-build-deployment --limit 3
```

After deployment, confirm the Pages run completed and the live site serves the
new cache version. Installed PWAs may need to be closed and reopened once for a
new service worker to take control.

## Current follow-ups

1. Use the momentum game for one week and adjust point balance only if a normal
   day feels either trivial or grindy.
2. Verify the refreshed layout and service-worker update on the iPhone PWA.
3. Add a timed-mile tracker when the mile program begins producing attempts.
4. Review the step-goal ramp against actual Garmin data before increasing its
   cap.
5. Recheck the school-year movement schedule before 2026-08-17.
6. Tune notification copy after observing which nudges lead to action.

## Release-note convention

Keep `CHANGELOG.md` answer-first and user-visible. Put new work under
`Unreleased` while developing, then move it into a dated version section when
publishing. Update this handoff when architecture, privacy boundaries,
deployment, data shape, or the priority list changes.
