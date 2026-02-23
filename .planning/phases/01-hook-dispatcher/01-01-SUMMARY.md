---
phase: 01-hook-dispatcher
plan: 01
subsystem: audio
tags: [afplay, node-esm, stdin, hooks, claude-code, sounds, json-dispatch]

# Dependency graph
requires: []
provides:
  - play.js stateless hook dispatcher (reads stdin JSON, maps hook_event_name to sounds, spawns afplay detached)
  - claude-peon.json config file with Claude Code hook event name triggers and 6 sound mappings
affects:
  - 02-config-schema-migration
  - 03-apply-remove-endpoints
  - 04-ui-apply-button
  - 05-branding-cleanup

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ESM script with import.meta.url for __dirname resolution (portable across CWD)"
    - "afplay spawned with detached:true + child.unref() for non-blocking audio"
    - "stdin consumed in async for-await loop before processing"
    - "process.exit(0) always — never exit 1 or 2 from hook scripts"
    - "No stdout writes anywhere — stdout is parsed by Claude Code as hook output"

key-files:
  created:
    - play.js
    - claude-peon.json
  modified: []

key-decisions:
  - "Phase 1 tool.before/tool.after triggers match ALL PreToolUse/PostToolUse events regardless of tool_name (per-tool filtering deferred to future)"
  - "Debug logging uses appendFileSync (sync is fine for single-run scripts, simpler than callback-based appendFile)"
  - "DEFAULT_CONFIG fallback has empty mappings array (not index.js defaults) — claude-peon.json is the single source of truth"
  - "WHISPER_VOLUME=1 hardcoded matching index.js — whisper sounds play at afplay volume 0.01"

patterns-established:
  - "Hook scripts: always read full stdin before processing, always exit 0, never write to stdout"
  - "Sound dispatch: iterate all mappings, play first match found (allows multiple mappings to fire)"
  - "Config loading: return { volume: 5, mappings: [] } default on any failure — never crash"

requirements-completed:
  - HOOK-01
  - HOOK-02
  - HOOK-03
  - HOOK-04
  - HOOK-05
  - HOOK-06
  - HOOK-07
  - HOOK-08
  - HOOK-09
  - HOOK-10

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 1 Plan 01: Hook Dispatcher Summary

**Stateless Node.js ESM script (play.js) that reads Claude Code hook stdin JSON, maps hook_event_name to sound mappings from claude-peon.json, and spawns afplay detached for async non-blocking audio playback**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T19:19:16Z
- **Completed:** 2026-02-23T19:21:19Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- play.js reads Claude Code hook event JSON from stdin and routes to sound mappings in O(n) dispatch loop
- afplay spawned with detached:true + child.unref() so play.js exits immediately while audio continues playing
- claude-peon.json covers all 6 supported hook events: Stop, SessionStart, UserPromptSubmit, Notification, PreToolUse, PostToolUse
- All edge cases handled silently: malformed JSON, missing hook_event_name, unrecognised events, non-macOS, missing afplay

## Task Commits

Each task was committed atomically:

1. **Task 1: Create play.js hook dispatcher** - `2dec050` (feat)
2. **Task 2: Create claude-peon.json config** - `97d0267` (feat)

## Files Created/Modified
- `play.js` - Stateless hook dispatcher: reads stdin JSON, matches event to config mappings, spawns afplay detached
- `claude-peon.json` - Config file with 6 mappings covering all Claude Code hook event name triggers

## Decisions Made
- Phase 1 tool.before/tool.after triggers match ALL PreToolUse/PostToolUse events regardless of tool_name. Per-tool filtering is deferred to a future phase per research recommendation.
- `appendFileSync` used in log helper instead of async `appendFile` — a single-run script has no event loop to keep alive, synchronous is simpler and correct.
- DEFAULT_CONFIG fallback returns empty mappings (not index.js defaults) — claude-peon.json is the sole source of truth; silent no-op on missing config is safer than playing unexpected sounds.
- `WHISPER_VOLUME = 1` hardcoded (same as index.js). Whisper sounds play at afplay volume ~0.01 (exponential curve).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- play.js is tested and working: all 6 hook events exit 0 with no stdout. Verify audible playback manually if desired.
- claude-peon.json is ready to be wired into ~/.claude/settings.json hooks (Phase 3 work).
- Phase 2 (Config Schema Migration) can begin — it will rename openpeon.json references and migrate preset files.
- Manual validation needed: confirm UserPromptSubmit fires at the right moment in Claude Code sessions (noted blocker in STATE.md).

---
*Phase: 01-hook-dispatcher*
*Completed: 2026-02-23*
