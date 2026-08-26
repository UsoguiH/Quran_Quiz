# Cadence — a routine app in Material Design 3

A daily routine tracker built to the Material 3 spec.

## Material 3 fidelity
- **Color** — the full M3 role set (primary / secondary / tertiary / error, their
  containers, five `surface-container` tiers, outline, inverse) generated with
  Google's own `@material/material-color-utilities` from seed `#0B57D0`
  (blue, tonal-spot scheme), for both light and dark.
- **Typography** — Roboto, self-hosted, on the M3 type scale (display / headline /
  title / body / label).
- **Shape & elevation** — the M3 corner scale (4/8/12/16/28dp) and elevation levels.
- **Motion** — M3 emphasized easing `cubic-bezier(0.2,0,0,1)` with 200/300/500ms durations.
- **Components** — center-aligned top app bar, bottom navigation with the active
  indicator pill, FAB, filled/text buttons, filled text field with floating label,
  filter and icon chips, checkboxes, switches, dialog with scrim, snackbar with undo,
  list items with state layers, and determinate circular progress.

## Material 3 Expressive indicators
- **Loading indicator** — a shape that morphs through a sequence of rounded polygons
  (soft burst, cookie, pentagon, pill, sunny, oval) while rotating, rendered as a
  smooth closed path generated per frame. Both variants: uncontained, and contained
  on a filled circle. Used on app boot and while insights recalculate.
- **Wavy linear progress** — active portion drawn as an animated sine wave with a gap,
  a flat track, and the M3 stop indicator dot. It waves while a section is in progress
  and settles flat at 0% or 100%. Shown under each time-of-day header.
- **Circular progress** — track and active arc with rounded caps and a gap between
  them, used for the daily ring.

## Features
- **Today** — routines grouped by Morning / Afternoon / Evening, a progress ring,
  and a streak counter. Each row shows how often you hit it in the last 7 days.
- **Routines** — enable/disable each routine, or delete with undo.
- **Insights** — current and best streak, 7-day completion rate, a weekly bar chart,
  and a per-routine consistency breakdown.
- Light/dark theme toggle that also follows the system setting.
- Progress persists in `localStorage`.

Streaks are scored against the routines that existed on each day, so adding a new
routine never rewrites your history.

## Files
- `app.html` — source (links `./fonts/`)
- `cadence.html` — self-contained build with fonts inlined; runs offline, no build step
