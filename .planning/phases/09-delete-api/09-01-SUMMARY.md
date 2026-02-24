---
phase: 09-delete-api
plan: 01
subsystem: api
tags: [bun, server, file-io, atomic-write, settings-json, hooks]

# Dependency graph
requires:
  - phase: 08-ui-loads-existing-hooks
    provides: readGlobalHooks() and GET /api/hooks endpoint already in server.js
provides:
  - Atomic saveConfig() using tmp+renameSync (SAFE-01 satisfied)
  - deleteHook(event, groupIndex) function with read-validate-mutate-write pattern
  - DELETE /api/hooks endpoint for removing a single hook group from settings.json
affects: [10-delete-ui, 11-cascade-delete]

# Tech tracking
tech-stack:
  added: []
  patterns: [atomic tmp+rename write applied to saveConfig, read-validate-mutate-write for destructive endpoints]

key-files:
  created: []
  modified: [ui/server.js]

key-decisions:
  - "deleteHook() allows deletion of any group by index including peon groups — server is agnostic, UI controls what is deletable (Phase 10)"
  - "Out-of-bounds groupIndex returns 400 (not 404) — signals bad request body, client should refresh and retry"
  - "deleteHook() touches settings.json only — claude-peon.json peon cascade deferred to Phase 11"

patterns-established:
  - "All input validation before any file mutation — 400 must leave settings.json untouched"
  - "Delete event key if array becomes empty after splice; delete hooks key if object becomes empty"

requirements-completed: [SAFE-01]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 9 Plan 01: Delete API Summary

**Atomic saveConfig() via tmp+renameSync and DELETE /api/hooks endpoint that removes a single hook group from settings.json with full input validation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T13:51:01Z
- **Completed:** 2026-02-24T13:52:40Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Fixed saveConfig() non-atomicity: replaced bare writeFileSync with tmp+renameSync pattern matching applyHooks/removeHooks (SAFE-01 satisfied)
- Added deleteHook(event, groupIndex) function following read-validate-mutate-write pattern from removeHooks()
- Added DELETE /api/hooks route with type-guarded input validation returning 400 before any file mutation

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix saveConfig() atomic write** - `7e0f045` (fix)
2. **Task 2: Add deleteHook() and DELETE /api/hooks route** - `3c7ee20` (feat)

## Files Created/Modified

- `/Users/lucassossai/dev/pessoal/claude-peon/ui/server.js` - Added atomic saveConfig(), deleteHook() function, and DELETE /api/hooks route

## Decisions Made

- deleteHook() allows deletion of any group including peon groups — server agnostic, UI controls what is deletable
- 400 for out-of-bounds index (not 404) — signals bad request body, client should refresh and retry
- Phase 9 only touches settings.json; claude-peon.json cascade is Phase 11

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DELETE /api/hooks endpoint ready for Phase 10 UI to consume
- Server agnostically deletes any hook group by index — UI will control which delete buttons appear
- Phase 11 cascade (remove peon mapping from claude-peon.json when last peon group deleted) not yet implemented

## Self-Check: PASSED

- FOUND: ui/server.js
- FOUND: 09-01-SUMMARY.md
- FOUND: commit 7e0f045 (fix saveConfig atomic write)
- FOUND: commit 3c7ee20 (deleteHook + DELETE /api/hooks)

---
*Phase: 09-delete-api*
*Completed: 2026-02-24*
