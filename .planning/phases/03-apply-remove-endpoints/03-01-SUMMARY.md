---
phase: 03-apply-remove-endpoints
plan: 01
subsystem: api
tags: [bun, hooks, settings-json, atomic-write, claude-code]

# Dependency graph
requires:
  - phase: 01-hook-dispatcher
    provides: play.js as the hook command target (PLAY_JS_PATH)
  - phase: 02-config-schema-migration
    provides: EVENT_VALUES aligned to the 6 Claude Code hook event names
provides:
  - POST /api/apply endpoint that merges claude-peon hook entries into ~/.claude/settings.json
  - POST /api/remove endpoint that strips all _claude_peon-marked hook groups from ~/.claude/settings.json
  - applyHooks() pure function with atomic write, idempotent insert, and read-back validation
  - removeHooks() pure function with atomic write, empty-key cleanup, and read-back validation
  - buildPeonGroup() helper returning the canonical _claude_peon-marked hook group object
affects: [04-ui-buttons, 05-branding-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Atomic write via writeFileSync(.tmp) + renameSync — same-directory .tmp guarantees same-filesystem rename (POSIX atomic, APFS verified)
    - Identity-marker remove — _claude_peon: true field distinguishes peon groups from all other hook groups
    - Read-merge-write — always read existing settings.json before writing; never clobber unrelated keys
    - Throw-on-corrupt — JSON.parse failure on existing settings.json propagates to caller as a user-visible error (never silently resets to {})
    - Idempotent apply — strip existing peon groups before inserting fresh ones (prevents duplicate-fire on repeated Apply)

key-files:
  created: []
  modified:
    - ui/server.js

key-decisions:
  - "PEON_EVENTS is a separate const from EVENT_VALUES (same values) to make apply/remove intent explicit and decoupled from the UI metadata endpoint"
  - "removeHooks() iterates Object.keys(settings.hooks) not PEON_EVENTS — ensures future events added by a future version of Apply are also removed"
  - "Parse failure on existing settings.json throws to caller instead of falling back to {} — per Pitfall 3 in research; avoids silent data loss"

patterns-established:
  - "Atomic write pattern: writeFileSync(path+'.tmp') then renameSync(path+'.tmp', path) — .tmp in same directory as target"
  - "Hook group identity marker: _claude_peon: true on the group object; Claude Code ignores unknown keys"

requirements-completed: [APLY-01, APLY-02, APLY-03, APLY-04, APLY-05]

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 03 Plan 01: Apply/Remove Endpoints Summary

**POST /api/apply and POST /api/remove endpoints added to ui/server.js — atomic read-merge-write into ~/.claude/settings.json with _claude_peon identity marker, idempotent insert, and empty-key cleanup on remove**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T20:50:52Z
- **Completed:** 2026-02-23T20:52:10Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- `applyHooks()`: reads existing settings.json (throws on corrupt), ensures `hooks` object exists, strips then re-inserts peon groups for all 6 PEON_EVENTS, writes atomically via `.tmp` + `renameSync`, validates by read-back parse
- `removeHooks()`: iterates all event keys (not just PEON_EVENTS), strips `_claude_peon`-marked groups, deletes empty event keys and empty `hooks` object, writes atomically, validates by read-back parse
- Both endpoints return JSON error responses on exception — never silently corrupt settings.json
- Added `renameSync` to fs imports and `dirname` to path imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement applyHooks() and POST /api/apply endpoint** - `8b86d22` (feat)
2. **Task 2: Implement removeHooks() and POST /api/remove endpoint** - `24d6d55` (feat)

## Files Created/Modified
- `ui/server.js` - Added SETTINGS_PATH, PLAY_JS_PATH, PEON_EVENTS constants; buildPeonGroup(), applyHooks(), removeHooks() functions; POST /api/apply and POST /api/remove route handlers; updated fs and path imports

## Decisions Made
- `PEON_EVENTS` is a separate const from `EVENT_VALUES` — both hold the same 6 event names but serve different purposes (one is API metadata, one drives hook insertion). Keeping them decoupled avoids accidental breakage if the UI ever exposes additional values.
- `removeHooks()` iterates `Object.keys(settings.hooks)` instead of `PEON_EVENTS` — a future version of apply might register additional events not in the current PEON_EVENTS list; remove must sweep all of them.
- Parse failure on existing settings.json throws to caller (returns `{ success: false, error: "..." }` to the HTTP client) — following research Pitfall 3 explicitly; silent fallback to `{}` would silently wipe the user's settings.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 (UI Buttons) can now wire Apply/Remove buttons to POST /api/apply and POST /api/remove
- Both endpoints return `restartRequired: true` (apply) which Phase 4 should surface as a "Restart Claude Code" toast
- The existing `deployPlugin()` / Deploy Plugin button remains untouched; Phase 5 handles its removal

---
*Phase: 03-apply-remove-endpoints*
*Completed: 2026-02-23*

## Self-Check: PASSED

- ui/server.js: FOUND
- 03-01-SUMMARY.md: FOUND
- Commit 8b86d22 (Task 1): FOUND
- Commit 24d6d55 (Task 2): FOUND
- _claude_peon marker: FOUND (3 occurrences)
- renameSync: FOUND (3 occurrences)
- /api/apply route: FOUND
- /api/remove route: FOUND
- async: true: FOUND
- PLAY_JS_PATH: FOUND (2 occurrences)
