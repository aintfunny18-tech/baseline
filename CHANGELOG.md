# Changelog

This file records user-visible changes to Baseline. Dates use Eastern Time.

## Unreleased

No unreleased changes.

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
