# Roadmap: claude-peon

## Overview

Convert claude-peon from the opencode plugin API to Claude Code's hooks system. The work has four natural delivery boundaries — a stateless hook dispatcher, a config schema migration, a safe Apply/Remove endpoint, and a UI button that closes the loop — followed by a branding cleanup pass. When all five phases are done, anyone can clone the repo, open the web UI, pick sounds, click Apply, restart Claude Code, and hear peon audio in their sessions.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Hook Dispatcher** - Build play.js — the stateless entry point that reads Claude Code hook stdin and plays sounds (completed 2026-02-23)
- [x] **Phase 2: Config Schema Migration** - Rename all trigger types from opencode event names to Claude Code hook event names (completed 2026-02-23)
- [x] **Phase 3: Apply/Remove Endpoints** - Write the server endpoints that merge and strip claude-peon hooks in ~/.claude/settings.json (completed 2026-02-23)
- [x] **Phase 4: UI Apply Button and UX** - Wire the UI button to the endpoints and surface the restart instruction (completed 2026-02-23)
- [ ] **Phase 5: Branding and Cleanup** - Remove all opencode/openpeon references, delete index.js, rewrite README

## Phase Details

### Phase 1: Hook Dispatcher
**Goal**: Anyone can pipe a Claude Code hook event JSON to play.js and hear the configured sound play
**Depends on**: Nothing (first phase)
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05, HOOK-06, HOOK-07, HOOK-08, HOOK-09, HOOK-10
**Success Criteria** (what must be TRUE):
  1. Running `echo '{"hook_event_name":"Stop"}' | node play.js` plays the configured stop sound
  2. Running `echo '{"hook_event_name":"PreToolUse"}' | node play.js` plays the tool-before sound
  3. Running `echo '{"hook_event_name":"Notification","params":{"type":"permission_prompt"}}' | node play.js` plays the notification sound
  4. play.js exits 0 and produces no stdout output for any supported event
  5. play.js exits 0 silently for any unrecognised event (no crash, no error output)
**Plans**: TBD

Plans:
- [ ] 01-01: Write play.js dispatcher (stdin parsing, event routing, async afplay spawn)

### Phase 2: Config Schema Migration
**Goal**: All trigger type names in config and preset files match Claude Code hook event names so the dispatcher resolves sounds correctly against every preset
**Depends on**: Phase 1
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04
**Success Criteria** (what must be TRUE):
  1. claude-peon.json default config contains only Claude Code hook event names (Stop, PreToolUse, PostToolUse, Notification, SessionStart, UserPromptSubmit)
  2. Every preset file in ui/presets/ uses the same Claude Code event name vocabulary
  3. Volume control still persists in config and applies on every play.js invocation
  4. Piping a Stop event to play.js with any preset loaded produces a sound (end-to-end smoke test)
**Plans**: 1 plan

Plans:
- [ ] 02-01-PLAN.md — Delete openpeon.json, migrate all preset event names and server.js to Claude Code hook vocabulary

### Phase 3: Apply/Remove Endpoints
**Goal**: Calling POST /api/apply writes working hook entries into ~/.claude/settings.json without corrupting the file or clobbering other hooks; calling POST /api/remove strips them cleanly
**Depends on**: Phase 1
**Requirements**: APLY-01, APLY-02, APLY-03, APLY-04, APLY-05
**Success Criteria** (what must be TRUE):
  1. After POST /api/apply, ~/.claude/settings.json contains claude-peon hook entries with absolute paths and async: true
  2. After POST /api/apply, any pre-existing hooks in settings.json are still present and unchanged
  3. After POST /api/remove, all claude-peon hook entries are gone and remaining hooks are intact
  4. If settings.json is missing or has no hooks key, Apply creates the structure correctly without error
  5. A deliberately corrupted .tmp file during apply never overwrites the real settings.json (atomic write guarantee)
**Plans**: 1 plan

Plans:
- [ ] 03-01-PLAN.md — Implement applyHooks()/removeHooks() and POST /api/apply + /api/remove endpoints in server.js

### Phase 4: UI Apply Button and UX
**Goal**: A user can click Apply in the web UI, see a confirmation that names the file written and instructs them to restart Claude Code, and optionally choose global vs project-scoped installation
**Depends on**: Phase 3
**Requirements**: APLY-06, APLY-07
**Success Criteria** (what must be TRUE):
  1. Clicking Apply in the UI shows a success message including the path written (e.g., ~/.claude/settings.json) and the words "Restart Claude Code to activate"
  2. The UI offers a visible choice between global (~/.claude) and project-scoped (.claude) hook installation before applying
  3. Clicking Remove in the UI shows a success confirmation after hooks are stripped
**Plans**: 1 plan

Plans:
- [ ] 04-01-PLAN.md — Add Apply/Remove buttons with scope selector, refactor server for scope-aware endpoints, confirmation toast with restart instruction

### Phase 5: Branding and Cleanup
**Goal**: The repository contains no references to opencode or openpeon; index.js is deleted; the README explains exactly how to go from clone to working sounds in Claude Code
**Depends on**: Phase 4
**Requirements**: BRND-01, BRND-02, BRND-03, BRND-04, BRND-05
**Success Criteria** (what must be TRUE):
  1. Searching the repo for "opencode" and "openpeon" returns zero results outside of git history
  2. package.json has no @opencode-ai/plugin dependency and package name reflects claude-peon
  3. index.js does not exist in the repo
  4. README.md contains a numbered setup flow: clone → run UI → pick sounds → click Apply → restart Claude Code
  5. Debug log path in play.js points to a claude-peon directory, not ~/.config/opencode/
**Plans**: 1 plan

Plans:
- [ ] 05-01-PLAN.md — Delete index.js, scrub legacy references, rewrite README and CLAUDE.md for Claude Code hooks

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Hook Dispatcher | 1/1 | Complete   | 2026-02-23 |
| 2. Config Schema Migration | 1/1 | Complete   | 2026-02-23 |
| 3. Apply/Remove Endpoints | 1/1 | Complete   | 2026-02-23 |
| 4. UI Apply Button and UX | 1/1 | Complete   | 2026-02-23 |
| 5. Branding and Cleanup | 0/1 | Not started | - |
