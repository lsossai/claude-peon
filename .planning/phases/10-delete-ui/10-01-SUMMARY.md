---
phase: 10-delete-ui
plan: 01
subsystem: ui
tags: [hooks, delete, confirmation, toast, fetch, javascript]

# Dependency graph
requires:
  - phase: 09-delete-api
    provides: DELETE /api/hooks endpoint accepting {event, groupIndex} body
provides:
  - deleteHookGroup() function in ui/index.html
  - hookRowMeta Map for safe command lookup without onclick injection
  - Delete buttons on every Active Hooks panel row with btn-delete styling
  - Confirmation dialogs with distinct peon vs external hook text
  - Panel refresh after delete, apply, and remove actions
affects: [11-peon-cascade]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - hookRowMeta Map pattern — store row data at render time keyed by eventName:groupIndex, retrieve in event handler (avoids XSS via onclick attribute injection)
    - Panel refresh consistency — all mutation actions (delete, apply, remove) call loadActiveHooks() after success

key-files:
  created: []
  modified:
    - ui/index.html

key-decisions:
  - "hookRowMeta Map keyed by 'eventName:groupIndex' avoids unsafe command string injection into onclick attributes"
  - "Peon and external hooks show distinct confirmation text — peon warns about Re-install with Apply, external warns deletion may be permanent"
  - "loadActiveHooks() called after apply and remove (not just delete) to keep panel consistent across all mutation paths"

patterns-established:
  - "Map-based row metadata: store at render time, retrieve in handler — use for any row-level action needing data not safe to embed in onclick"

requirements-completed: [DEL-01, DEL-02, DEL-03, DEL-04, DEL-05]

# Metrics
duration: ~5min
completed: 2026-02-24
---

# Phase 10 Plan 01: Delete UI Summary

**Delete buttons with per-row confirm dialogs, hookRowMeta Map for XSS-safe command lookup, toast feedback, and panel refresh on delete/apply/remove**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-24T14:00:00Z
- **Completed:** 2026-02-24T14:05:59Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 1

## Accomplishments
- Added deleteHookGroup() function that fetches DELETE /api/hooks, shows toast, and refreshes panel
- Rendered "x" delete buttons on every Active Hooks panel row using existing btn-delete styling
- Implemented hookRowMeta Map to safely store {cmd, isPeon} at render time, avoiding onclick attribute injection
- Distinct confirmation text for peon hooks ("Re-install with Apply") vs external hooks ("Deletion may be permanent")
- Extended applyHooks() and removeHooks() to call loadActiveHooks() after success for full panel consistency

## Task Commits

Each task was committed atomically:

1. **Task 1: Add delete buttons and deleteHookGroup() to Active Hooks panel** - `4fbb15a` (feat)
2. **Task 2: Verify delete flow end-to-end** - human checkpoint, approved by user

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `ui/index.html` - Added hookRowMeta Map, delete buttons in hook group rows, deleteHookGroup() function, loadActiveHooks() calls in applyHooks() and removeHooks()

## Decisions Made
- hookRowMeta Map keyed by `eventName:groupIndex` avoids unsafe command string injection into onclick attributes — follows same pattern as existing deletePreset()
- Distinct confirmation text branches on isPeon flag already stored in hookRowMeta
- loadActiveHooks() refresh added to apply/remove paths (not only delete) to ensure panel never shows stale state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Delete UI is complete end-to-end (DEL-01 through DEL-05 satisfied)
- Phase 11 (peon cascade) can now build on this foundation — when a peon hook group is deleted via the UI, Phase 11 will wire in the claude-peon.json mapping cleanup

---
*Phase: 10-delete-ui*
*Completed: 2026-02-24*
