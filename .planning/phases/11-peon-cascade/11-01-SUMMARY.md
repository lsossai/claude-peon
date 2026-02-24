---
phase: 11-peon-cascade
plan: 01
subsystem: ui
tags: [bun, server, hooks, config, delete, cascade]

# Dependency graph
requires:
  - phase: 10-delete-ui
    provides: hookRowMeta Map, isPeon flag, deleteHookGroup() skeleton, loadActiveHooks() panel
  - phase: 09-delete-api
    provides: deleteHook(), saveConfig() atomicity (SAFE-01), GET /api/hooks endpoint
provides:
  - deletePeonMapping() server function with CASC-01 + CASC-02 semantics
  - DELETE /api/peon-mappings API route with index + name validation
  - Peon section in Active Hooks panel showing one row per mapping (not per event group)
  - Forked deleteHookGroup() routing peon deletes to new endpoint, external deletes unchanged
affects: [future-phases, milestone-v1.2]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "peon:N hookRowMeta key scheme — disjoint from eventName:groupIndex to avoid collisions"
    - "Write order: claude-peon.json first (saveConfig), settings.json second (removeHooks) — ghost hooks are harmless no-ops"
    - "CASC-02 auto-strip: when last mapping deleted, removeHooks() called inside try/catch (non-fatal)"
    - "Client fork on isPeon flag at click time — lookups hookRowMeta for metadata, not re-fetch"

key-files:
  created: []
  modified:
    - ui/server.js
    - ui/index.html

key-decisions:
  - "Active Hooks peon rows sourced from claude-peon.json (one per mapping), not settings.json (would be one per event group — 6 rows for 1 mapping)"
  - "peon:N key prefix for hookRowMeta is disjoint from any real Claude Code event name — no collision possible"
  - "removeHooks() wrapped in try/catch in deletePeonMapping() — ghost hooks (play.js finds no trigger) are harmless; dead mappings (no hook) are confusing"
  - "loadConfig() called after peon delete (not renderMappings() directly) — fetches fresh disk state before re-rendering Mappings section"

patterns-established:
  - "Pattern: isPeon fork in deleteHookGroup() — peon path calls /api/peon-mappings, external path calls /api/hooks"
  - "Pattern: parallel fetch in loadActiveHooks() — Promise.all([/api/hooks, /api/config]) for peon+external combined render"

requirements-completed: [CASC-01, CASC-02]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 11 Plan 01: Peon Cascade Summary

**Peon cascade delete: per-mapping deletion from claude-peon.json with auto-strip of settings.json peon groups when last mapping is removed (CASC-01 + CASC-02)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T14:22:29Z
- **Completed:** 2026-02-24T14:24:28Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `deletePeonMapping(mappingIndex, expectedName)` to server.js with bounds check, optional name guard against stale client state, atomic write to claude-peon.json via `saveConfig()`, and CASC-02 auto-strip via `removeHooks()` when last mapping is deleted
- Added `DELETE /api/peon-mappings` route with request validation, 400/500 error responses, and `{ success, cascaded }` response shape
- Rewrote `loadActiveHooks()` to fetch `/api/hooks` and `/api/config` in parallel, suppress peon event-group rows from settings.json, and render one row per mapping from claude-peon.json with `peon:N` hookRowMeta keys
- Forked `deleteHookGroup()` on `isPeon`: peon rows call `DELETE /api/peon-mappings` and refresh both Active Hooks and Mappings sections; external rows use unchanged `DELETE /api/hooks` path

## Task Commits

Each task was committed atomically:

1. **Task 1: Add deletePeonMapping() and DELETE /api/peon-mappings endpoint** - `d8bb555` (feat)
2. **Task 2: Render peon mapping rows and fork deleteHookGroup() on isPeon** - `d26822f` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `ui/server.js` - Added `deletePeonMapping()` function and `DELETE /api/peon-mappings` route in `handleApi()`
- `ui/index.html` - Rewrote `loadActiveHooks()` for peon+external parallel fetch; forked `deleteHookGroup()` on `isPeon`

## Decisions Made

- Peon rows in Active Hooks panel sourced from `claude-peon.json` mappings (not `settings.json` groups) — settings.json has 1 shared group per event for ALL mappings; deleting one event group would break all remaining mappings
- `peon:N` key prefix for `hookRowMeta` entries is disjoint from any real Claude Code event name — no key collision possible with `${eventName}:${groupIndex}` keys
- `removeHooks()` in CASC-02 wrapped in `try/catch` — if it fails, ghost hooks (play.js runs, finds no matching trigger) are silent no-ops; the mapping is already gone from `claude-peon.json`
- `await loadConfig()` called after peon delete (not `renderMappings()` directly) — `loadConfig()` fetches fresh data from disk and calls `renderMappings()` internally, ensuring Mappings section reflects server-side deletion

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- v1.2 milestone (Delete Hooks from UI) is complete: delete API (Phase 9), delete UI (Phase 10), peon cascade (Phase 11)
- No blockers for v1.3 planning

---
*Phase: 11-peon-cascade*
*Completed: 2026-02-24*
