# Changelog

This file records user-visible changes to Baseline. Dates use Eastern Time.

## Unreleased

No unreleased changes.

## 1.3.0 - 2026-07-12

### Added

- Daily Sort, a rotating bank of fourteen 4-by-3 grouping puzzles with four
  hidden sets of three and no loss condition or streak penalty.
- A one-tap daily read—low bandwidth, steady, or ready for more—that turns
  current Garmin steps, dinner status, and the movement plan into one useful
  recommendation.
- Automatic source labels on the weekly dinner list.

### Changed

- Today now centers the daily game, adaptive route, dinner decision, planned
  movement, and an automatically refreshed Garmin step bar.
- Weight remains available as a trend but no longer appears as a logging task
  on Today.
- Food notes remain available behind an optional disclosure instead of being a
  required-looking daily form.
- The daily-set bonus now uses dinner, movement, and the one-tap daily read.

### Removed

- App-icon badge counts. Push notifications continue without bubble counts.
- Manual weight entry, manual step entry, and the separate Garmin-weight file
  import; weight and steps arrive through private sync.
- The click-based side-quest picker and three-row check-in.

### Fixed

- The meal publisher no longer treats numbered cart-building rules in a
  single-meal Dinner Games brief as the week's dinners. It selects the newest
  handoff with an explicit multi-meal weekly list.
- The current week was restored to the five dinners in the July 10 weekly
  handoff.

## 1.2.0 - 2026-07-12

### Added

- Reminder health on Today and in Settings, including server-send and
  device-receipt timestamps.
- One-tap reminder repair and app-triggered test sends.
- A daily choice-based side quest worth 8 momentum points.
- A 10-point daily quest-set bonus and 5-point comeback bonus after a gap.
- Home-screen app badges showing unfinished daily actions when supported.
- A private, automatically refreshed early-impact card in Trends.
- Private daily engagement aggregates for future app-use/outcome comparisons;
  meal text, weight, and free-text wins are excluded.
- Stale Garmin-data warnings.

### Changed

- Weight entry is collapsed by default to keep the daily interaction loop
  focused on quick actions.
- Reminder taps now open the relevant morning, lunch, or dinner action.
- Push-subscription repair compares the complete subscription, resubscribes
  when missing, and refreshes a server copy older than 20 hours whenever the
  app runs.

### Fixed

- Scheduled reminders previously sent zero pushes because delayed GitHub jobs
  fell outside narrow one-hour gates while still reporting success.
- The repaired sender makes several attempts per slot, deduplicates successful
  sends, records missed or expired delivery state, and passed a live test.
- Garmin sync no longer falls into an unusable credential prompt during an
  unattended task after a transient cached-session failure.
- Garmin uploads now use standard input instead of exceeding Windows' process
  command-length limit.
- The Windows sync task now starts when available, retries, runs on battery,
  wakes the PC, and writes sanitized status plus rotating local logs.

## 1.1.0 - 2026-07-10

### Added

- Momentum points derived from existing private records.
- 80-point levels with a clear next-level progress indicator.
- Three daily quests: decide dinner, move intentionally, and take one mindful
  pause before seconds.
- A seven-day momentum history and three independent weekly campaign tracks.
- Six milestones for check-ins, mindful pauses, dinner planning, movement,
  weekend activity, and five-day check-in weeks.
- A Settings control that hides the game layer without deleting any records.
- A persistent development handoff covering architecture, privacy boundaries,
  validation, deployment, and future work.

### Changed

- Refreshed the interface with a more energetic green-and-gold visual system.
- Updated interaction messages to show the momentum earned by an action.
- Updated app metadata and the offline cache to ship the new experience.

### Guardrails

- Check-in answers earn equal points regardless of which answer is selected.
- Food content, scale outcomes, rest days, and missed days are never scored.
- Movement is not presented as payment for eating.

## 1.0.0 - 2026-07-07

### Added

- Local-first installable PWA with IndexedDB storage and offline support.
- Weight entry, seven-entry trend calculations, and Garmin weight import.
- Daily meal, dinner-time, and movement check-ins.
- Free-form meal logging and weekly dinner-plan import.
- Summer and school-year movement plans, exercise how-tos, and interval timer.
- Step history and gradually increasing step targets.
- Weekly reviews, rolling consistency, and a non-scale wins log.
- Optional private GitHub data sync and web-push notification support.
