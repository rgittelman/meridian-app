# Development workflow (Meridian)

## Default loop

- **Iterate locally first**: use a desktop browser with responsive / mobile device preview for layout and touch targets.
- **Do not require Android PWA testing** after every small change. Reserve real PWA / Android checks for meaningful checkpoints or when the change specifically targets PWA, service worker, install flow, or native mobile behaviors.

## Meaningful checkpoints (when to prep commit / deploy / “ready for device”)

Treat these as natural review boundaries—not every PR-sized tweak:

- Full **Today** visual / structure pass
- Full **Daily Briefing** pass
- **Chat intent router** or extraction / persistence pass
- **Add / edit** flows (tasks, reminders, events, sheets)
- **Motion / interaction** pass (gestures, Framer Motion, haptics)

Between checkpoints: build locally, summarize what changed, and **ask before creating a commit or deploying** unless the user explicitly asked for that step.

## Git / deploy

- **No push or deploy** after every small adjustment unless the user explicitly requests it.
- Aligns with: only commit when the user asks; at checkpoints, summarize first, then confirm if they want a commit and/or deploy.

## Goal

Reduce friction, preserve creative momentum, and keep device testing for when it earns the time.
