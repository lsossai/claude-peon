# Roadmap: claude-peon

## Milestones

- ✅ **v1.0 Convert to Claude Code Hooks** - Phases 1-5 (shipped 2026-02-23)
- ✅ **v1.1 Polish and Fix** - Phases 6-8 (shipped 2026-02-24)
- 🚧 **v1.2 Delete Hooks from UI** - Phases 9-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 Convert to Claude Code Hooks (Phases 1-5) - SHIPPED 2026-02-23</summary>

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
**Plans**: 1 plan

Plans:
- [x] 01-01: Write play.js dispatcher (stdin parsing, event routing, async afplay spawn)

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
- [x] 02-01: Delete openpeon.json, migrate all preset event names and server.js to Claude Code hook vocabulary

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
- [x] 03-01: Implement applyHooks()/removeHooks() and POST /api/apply + /api/remove endpoints in server.js

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
- [x] 04-01: Add Apply/Remove buttons with scope selector, refactor server for scope-aware endpoints, confirmation toast with restart instruction

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
- [x] 05-01: Delete index.js, scrub legacy references, rewrite README and CLAUDE.md for Claude Code hooks

</details>

<details>
<summary>✅ v1.1 Polish and Fix (Phases 6-8) - SHIPPED 2026-02-24</summary>

#### Phase 6: Fix Sound Playback
**Goal**: Sounds play reliably in Claude Code sessions — play.js is invocable as a hook command and the Apply button writes a command string that survives non-login shell environments
**Depends on**: Phase 5
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04
**Success Criteria** (what must be TRUE):
  1. Running `bash -c "/path/to/play.js"` exits 0 instead of 126 (executable bit set and committed to git)
  2. After clicking Apply, ~/.claude/settings.json hook commands use absolute node path format (`/abs/path/node /abs/path/play.js`) not a bare script path
  3. Opening a Claude Code session and triggering a Stop event plays the configured sound without any manual intervention
  4. If node cannot be resolved at Apply time, the UI shows a clear error message instead of writing a broken command
**Plans**: 1 plan

Plans:
- [x] 06-01-PLAN.md -- Add shebang + executable bit to play.js, update buildPeonGroup() to embed absolute node path via Bun.which(), guard Apply with null check

#### Phase 7: Remove Project Scope
**Goal**: The UI and server always target ~/.claude/settings.json with no scope choice — and any project-scoped peon hooks left over from v1.0 are cleaned up to prevent double sounds
**Depends on**: Phase 6
**Requirements**: SCOP-01, SCOP-02, SCOP-03
**Success Criteria** (what must be TRUE):
  1. The UI has no scope radio buttons or scope-related controls — Apply always targets ~/.claude/settings.json
  2. The Apply and Remove operations in server.js accept no scope parameter and only write/read the global settings path
  3. After clicking Apply or Remove, any peon hook groups in a project-local .claude/settings.json are also stripped (no double sounds)
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md -- Remove scope from server.js and index.html, add project-local peon hook orphan cleanup

#### Phase 8: UI Loads Existing Hooks
**Goal**: Opening the config UI shows all hooks currently registered in ~/.claude/settings.json — peon and non-peon — so the user can see exactly what is installed without opening the file manually
**Depends on**: Phase 7
**Requirements**: VISI-01, VISI-02, VISI-03
**Success Criteria** (what must be TRUE):
  1. GET /api/hooks returns the raw hooks object from ~/.claude/settings.json including non-peon hooks (ruff-format, hand-crafted afplay groups, etc.)
  2. On page load, the UI shows an Active Hooks panel listing all hooks from settings.json without any user action
  3. Peon hook groups are visually distinguished from non-peon hooks in the panel (e.g., badge or accent color) so the user can tell what claude-peon installed vs what was already there
**Plans**: 1 plan

Plans:
- [x] 08-01-PLAN.md -- Add GET /api/hooks endpoint and Active Hooks read-only panel to UI

</details>

### 🚧 v1.2 Delete Hooks from UI (Phases 9-11)

**Milestone Goal:** Let users delete any hook directly from the Active Hooks panel — both peon-installed and external hooks — with confirmation, toast feedback, and panel refresh.

- [ ] **Phase 9: Delete API** - Server endpoint and saveConfig() atomicity fix
- [ ] **Phase 10: Delete UI** - Delete buttons, confirmation dialog, toast, and panel refresh
- [ ] **Phase 11: Peon Cascade** - Mapping removal from claude-peon.json and last-mapping auto-strip from settings.json

## Phase Details

### Phase 9: Delete API
**Goal**: The server can delete any hook group from ~/.claude/settings.json via a validated endpoint, and claude-peon.json writes are safe from corruption
**Depends on**: Phase 8
**Requirements**: SAFE-01
**Success Criteria** (what must be TRUE):
  1. `saveConfig()` in server.js writes to a `.tmp` file and renames atomically — a process kill mid-write leaves claude-peon.json intact
  2. `DELETE /api/hooks` with a valid `{ event, groupIndex }` body removes the targeted hook group from ~/.claude/settings.json and returns `{ success: true }`
  3. `DELETE /api/hooks` with an out-of-bounds groupIndex returns a 400 error and leaves settings.json unchanged
  4. After a successful delete, calling `GET /api/hooks` no longer returns the deleted group
**Plans**: TBD

### Phase 10: Delete UI
**Goal**: Every hook group row in the Active Hooks panel has a working delete button — clicking it confirms, sends the delete request, shows a toast, and refreshes the panel
**Depends on**: Phase 9
**Requirements**: DEL-01, DEL-02, DEL-03, DEL-04, DEL-05
**Success Criteria** (what must be TRUE):
  1. Every hook group row in the Active Hooks panel shows a delete button (x or trash icon)
  2. Clicking a delete button on an external hook shows a confirmation dialog naming the event and command before proceeding
  3. Clicking a delete button on a peon hook shows a confirmation dialog that additionally notes the sound mapping will be removed
  4. After confirming deletion, the Active Hooks panel refreshes and the deleted row is gone without a full page reload
  5. After confirming deletion, a toast notification appears confirming the hook was deleted
**Plans**: TBD

### Phase 11: Peon Cascade
**Goal**: Deleting a peon hook row removes the corresponding mapping from claude-peon.json, and when the last peon mapping is gone the peon groups in settings.json are auto-stripped
**Depends on**: Phase 10
**Requirements**: CASC-01, CASC-02
**Success Criteria** (what must be TRUE):
  1. Deleting a peon hook row from the Active Hooks panel removes the corresponding mapping entry from claude-peon.json (the Mappings editor reflects the removal on next load)
  2. When the last peon mapping is deleted, all `_claude_peon: true` hook groups are automatically removed from ~/.claude/settings.json without any additional user action
  3. After the last peon mapping is deleted, the Active Hooks panel shows no peon hook groups
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Hook Dispatcher | v1.0 | 1/1 | Complete | 2026-02-23 |
| 2. Config Schema Migration | v1.0 | 1/1 | Complete | 2026-02-23 |
| 3. Apply/Remove Endpoints | v1.0 | 1/1 | Complete | 2026-02-23 |
| 4. UI Apply Button and UX | v1.0 | 1/1 | Complete | 2026-02-23 |
| 5. Branding and Cleanup | v1.0 | 1/1 | Complete | 2026-02-23 |
| 6. Fix Sound Playback | v1.1 | 1/1 | Complete | 2026-02-24 |
| 7. Remove Project Scope | v1.1 | 1/1 | Complete | 2026-02-24 |
| 8. UI Loads Existing Hooks | v1.1 | 1/1 | Complete | 2026-02-24 |
| 9. Delete API | v1.2 | 0/1 | Not started | - |
| 10. Delete UI | v1.2 | 0/1 | Not started | - |
| 11. Peon Cascade | v1.2 | 0/1 | Not started | - |
