# Baseline

A private, local-first momentum game for weight, movement, and meals.
Daily grouping puzzles, adaptive routes, levels, campaigns, and milestones
reward attention and follow-through.
No calorie counting, no food labels, no guilt mechanics — habit-based
by design.

- Vanilla HTML/CSS/JS, no build step, no dependencies
- IndexedDB storage on-device; optional sync from a private GitHub data repo.
  Read-only Contents access is enough for data pulls; reminders, test sends,
  and private engagement summaries require read-and-write Contents access.
- Installable (manifest + service worker, offline-capable)
- Health-checked morning, lunch, and dinner web-push reminders
- Automatic Garmin weight and step intake with no duplicate entry fields
- Private Garmin sync and an automatically refreshed early-impact comparison

Personal project; data stays with its owner.

## Development record

- [Development handoff](HANDOFF.md)
- [Changelog](CHANGELOG.md)
- [Public app](https://aintfunny18-tech.github.io/baseline/)
