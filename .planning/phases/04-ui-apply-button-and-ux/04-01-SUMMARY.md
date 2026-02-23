---
phase: 04-ui-apply-button-and-ux
plan: 01
subsystem: ui
tags: [bun, html, javascript, settings.json, hooks]

# Dependency graph
requires:
  - phase: 03-apply-remove-endpoints
    provides: POST /api/apply and POST /api/remove endpoints in ui/server.js
provides:
  - Scope-parameterized applyHooks/removeHooks with displayPath in server responses
  - Apply and Remove buttons in the config UI toolbar with Global/Project scope selector
  - Toast feedback with path and "Restart Claude Code to activate" message on Apply
  - Confirm dialog guard on Remove
affects: [future phases that reference ui/server.js or ui/index.html hook management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "req.json().then() async pattern for POST body parsing (matching existing /api/config handler)"
    - "Scope helper functions (getSettingsPath/getDisplayPath) instead of module-level constant"

key-files:
  created: []
  modified:
    - ui/server.js
    - ui/index.html

key-decisions:
  - "SETTINGS_PATH module-level constant removed; replaced by getSettingsPath(scope) — avoids a single hardcoded path and makes scope switching clean"
  - "displayPath returned from server (never hardcoded client-side) — client always reflects actual path written"
  - "applyHooks() saves config before applying, matching deployPlugin() pattern"

patterns-established:
  - "Scope parameter pattern: getSettingsPath(scope)/getDisplayPath(scope) pair for any future multi-scope operations"

requirements-completed: [APLY-06, APLY-07]

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 4 Plan 01: UI Apply Button and UX Summary

**Apply/Remove buttons with Global/Project scope selector wired to /api/apply and /api/remove, with toast feedback showing written path and "Restart Claude Code to activate"**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-23T21:04:41Z
- **Completed:** 2026-02-23T21:06:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Refactored `ui/server.js` to support scope-aware hook installation via `getSettingsPath(scope)` and `getDisplayPath(scope)` helpers
- Removed module-level `SETTINGS_PATH` constant and replaced all usages with the new scope-parameterized helpers
- `applyHooks(scope)` and `removeHooks(scope)` now return `displayPath` in their responses
- `/api/apply` and `/api/remove` handlers parse request body for scope using the `req.json().then()` pattern
- Added Apply/Remove buttons with Global/Project radio scope selector to the toolbar in `ui/index.html`
- Apply saves config first then shows success toast with written path and "Restart Claude Code to activate"
- Remove shows `confirm()` dialog before executing, then success toast with removed path

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor server.js for scope-parameterized apply/remove with displayPath** - `a13e783` (feat)
2. **Task 2: Add Apply/Remove buttons, scope selector, and JS functions to index.html** - `e776242` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `ui/server.js` - Added getSettingsPath/getDisplayPath helpers, scope param to applyHooks/removeHooks, displayPath in responses, async body parsing in handlers
- `ui/index.html` - Apply/Remove buttons with scope radio selector in toolbar, applyHooks/removeHooks JS functions with toast feedback

## Decisions Made
- `SETTINGS_PATH` module-level constant removed and replaced by `getSettingsPath(scope)` — a single constant would force a server restart to switch scope; helper functions are stateless and clean.
- `displayPath` always comes from server response, never hardcoded client-side — this ensures the UI accurately reflects the actual path written regardless of scope.
- `applyHooks()` saves config before applying (same pattern as `deployPlugin()`) — ensures latest sound mappings are installed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Apply/Remove UX is complete. Users can install hooks for global or project scope directly from the browser.
- Phase 5 (if any) can build on the scope infrastructure already in place.
- Existing concern documented: users should close active Claude Code sessions before applying (concurrent write risk).

## Self-Check: PASSED

- FOUND: ui/server.js
- FOUND: ui/index.html
- FOUND: .planning/phases/04-ui-apply-button-and-ux/04-01-SUMMARY.md
- FOUND commit: a13e783 (feat: scope-parameterized server.js)
- FOUND commit: e776242 (feat: Apply/Remove buttons in index.html)

---
*Phase: 04-ui-apply-button-and-ux*
*Completed: 2026-02-23*
