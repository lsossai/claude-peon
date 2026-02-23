# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Sounds play reliably in Claude Code sessions with zero manual config file editing — the web UI handles everything including hook installation.
**Current focus:** Phase 2 — Config Schema Migration

## Current Position

**Phase:** 3 of 5 (Apply/Remove Endpoints)
**Current Plan:** 1 of 1 (complete)
**Total Plans in Phase:** 1
**Status:** Milestone complete
**Last Activity:** 2026-02-23

Progress: [██████░░░░] 60% (3/5 phases; Phase 3 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-hook-dispatcher P01 | 2min | 2 tasks | 2 files |
| Phase 02-config-schema-migration P01 | 8min | 2 tasks | 6 files |
| Phase 03-apply-remove-endpoints P01 | 2min | 2 tasks | 1 file |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Hooks-only, no MCP: simpler setup; hooks are sufficient for all sound triggers
- Web UI handles hook installation: users never edit JSON manually
- Clone-and-run, no npm publish: sound files must be local anyway
- [Phase 01-hook-dispatcher]: Phase 1 tool.before/tool.after triggers match ALL PreToolUse/PostToolUse events — per-tool filtering deferred to future phase
- [Phase 01-hook-dispatcher]: Debug logging uses appendFileSync (sync is fine for single-run scripts)
- [Phase 01-hook-dispatcher]: DEFAULT_CONFIG fallback has empty mappings array — claude-peon.json is the single source of truth
- [Phase 02-config-schema-migration]: scbw-scv.json session.created collapsed into SessionStart; tool.before:question removed from all permission-asked mappings in favor of Notification event trigger only
- [Phase 02-config-schema-migration]: UI EVENT_VALUES trimmed to exactly 6 Claude Code hook names; no legacy OpenCode events remain
- [Phase 03-apply-remove-endpoints]: PEON_EVENTS is a separate const from EVENT_VALUES — same 6 values but decoupled so UI metadata and hook insertion are independent
- [Phase 03-apply-remove-endpoints]: removeHooks() iterates Object.keys(settings.hooks) not PEON_EVENTS — forward-compatible with future events
- [Phase 03-apply-remove-endpoints]: Parse failure on existing settings.json throws to caller — never silently resets to {} per Pitfall 3

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 4: Warn users to close active Claude Code sessions before applying (concurrent write risk per issue #15608) — UI should show "Restart Claude Code to activate" after successful apply
- Phase 1: Validate UserPromptSubmit timing manually — weakest opencode-to-hooks mapping

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 03-01-PLAN.md — POST /api/apply and POST /api/remove endpoints added to ui/server.js with atomic write, idempotent insert, and _claude_peon identity marker
Resume file: None
