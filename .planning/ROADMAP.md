# Roadmap: claude-peon

## Milestones

- ✅ **v1.0 Convert to Claude Code Hooks** - Phases 1-5 (shipped 2026-02-23)
- ✅ **v1.1 Polish and Fix** - Phases 6-8 (shipped 2026-02-24)
- ✅ **v1.2 Delete Hooks from UI** - Phases 9-11 (shipped 2026-02-24)
- 🚧 **v1.3 Config UX Polish** - Phases 12-16 (in progress)

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

<details>
<summary>✅ v1.2 Delete Hooks from UI (Phases 9-11) - SHIPPED 2026-02-24</summary>

### Phase 9: Delete API
**Goal**: The server can delete any hook group from ~/.claude/settings.json via a validated endpoint, and claude-peon.json writes are safe from corruption
**Depends on**: Phase 8
**Requirements**: SAFE-01
**Success Criteria** (what must be TRUE):
  1. `saveConfig()` in server.js writes to a `.tmp` file and renames atomically — a process kill mid-write leaves claude-peon.json intact
  2. `DELETE /api/hooks` with a valid `{ event, groupIndex }` body removes the targeted hook group from ~/.claude/settings.json and returns `{ success: true }`
  3. `DELETE /api/hooks` with an out-of-bounds groupIndex returns a 400 error and leaves settings.json unchanged
  4. After a successful delete, calling `GET /api/hooks` no longer returns the deleted group
**Plans**: 1 plan

Plans:
- [x] 09-01-PLAN.md -- Fix saveConfig() atomicity and add DELETE /api/hooks endpoint

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
**Plans**: 1 plan

Plans:
- [x] 10-01-PLAN.md -- Add delete buttons to Active Hooks panel with confirm dialog, toast, and panel refresh

### Phase 11: Peon Cascade
**Goal**: Deleting a peon hook row removes the corresponding mapping from claude-peon.json, and when the last peon mapping is gone the peon groups in settings.json are auto-stripped
**Depends on**: Phase 10
**Requirements**: CASC-01, CASC-02
**Success Criteria** (what must be TRUE):
  1. Deleting a peon hook row from the Active Hooks panel removes the corresponding mapping entry from claude-peon.json (the Mappings editor reflects the removal on next load)
  2. When the last peon mapping is deleted, all `_claude_peon: true` hook groups are automatically removed from ~/.claude/settings.json without any additional user action
  3. After the last peon mapping is deleted, the Active Hooks panel shows no peon hook groups
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md -- Add deletePeonMapping() endpoint and peon mapping rows with cascade delete in UI

</details>

### v1.3 Config UX Polish (Phases 12-16)

**Milestone Goal:** Make the config UI intuitive — users understand triggers, preview sounds, load presets confidently, and edit mappings without friction.

- [x] **Phase 12: Bundled Presets** - Add missing bundled preset JSON files for all sound packs (completed 2026-02-24)
- [x] **Phase 13: Server Foundation** - MP3 MIME type fix and trigger event descriptions via /api/meta (completed 2026-02-24)
- [ ] **Phase 14: Trigger Descriptions and Mapping Editor Polish** - Inline trigger descriptions, whisper toggle, cleaner card layout
- [ ] **Phase 15: Inline Sound Playback** - Play buttons on sound rows in mapping cards
- [ ] **Phase 16: Preset Visual Preview** - Hover preview popover and unsaved-changes guard

## Phase Details

### Phase 12: Bundled Presets
**Goal**: Every sound pack in the repo has a bundled preset so users can load any pack without configuring from scratch
**Depends on**: Phase 11
**Requirements**: PRST-01
**Success Criteria** (what must be TRUE):
  1. The presets panel shows bundled preset chips for WC2 Alliance, SC2 Terran, SC2 Protoss, SC2 Zerg, SC:BW Terran, SC:BW Protoss, SC:BW Zerg, and SC:BW Misc
  2. Clicking a bundled preset chip loads a complete mapping set that plays sounds exclusively from that sound pack
  3. Bundled preset chips have no delete (x) button — they cannot be removed from the presets list
  4. Clicking Load on a bundled preset produces audible sound output when a relevant Claude Code event fires
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md -- Create 8 bundled preset JSON files and protect bundled chips from deletion in UI

### Phase 13: Server Foundation
**Goal**: The server correctly serves SC2 MP3 files to the browser and exposes trigger event descriptions so client-side features have a stable data source
**Depends on**: Phase 12
**Requirements**: TRIG-02, PLAY-05
**Success Criteria** (what must be TRUE):
  1. Clicking the play button on an SC2 sound in the sound browser modal plays the sound without a MIME type error in the browser console
  2. GET /api/meta returns an `eventDescriptions` object with a description string for each of the six Claude Code hook events (Stop, PreToolUse, PostToolUse, Notification, SessionStart, UserPromptSubmit)
  3. GET /api/meta also returns descriptions for tool trigger types (tool.before, tool.after)
**Plans**: 1 plan

Plans:
- [ ] 13-01-PLAN.md -- Fix MP3 MIME type in sound serve endpoint and add event/tool descriptions to /api/meta

### Phase 14: Trigger Descriptions and Mapping Editor Polish
**Goal**: Users can see what each trigger event means directly in the mapping card — and the whisper toggle is discoverable without knowing the JSON schema
**Depends on**: Phase 13
**Requirements**: TRIG-01, EDIT-02, EDIT-03
**Success Criteria** (what must be TRUE):
  1. Each trigger row in a mapping card shows a description line beneath the event selector explaining when that event fires (e.g., "Fires when the agent finishes its turn")
  2. Hovering over a trigger type selector shows a tooltip with the same event description
  3. Each mapping card header has a visible whisper toggle — toggling it updates the card label immediately without a page reload
  4. The mapping card layout has a clear visual separation between the trigger section and the sound list section
**Plans**: TBD

### Phase 15: Inline Sound Playback
**Goal**: Users can audition any sound already assigned to a mapping without opening the sound browser modal
**Depends on**: Phase 13
**Requirements**: EDIT-01
**Success Criteria** (what must be TRUE):
  1. Every sound row in a mapping card shows a play button (triangle icon) to the left of the filename
  2. Clicking the play button plays that sound file through the browser — no modal opens, no page change occurs
  3. Playing one sound while another is already playing stops the previous sound (sequential, not overlapping)
  4. SC2 MP3 sounds play correctly via the mapping card play button (depends on Phase 13 MIME fix)
**Plans**: TBD

### Phase 16: Preset Visual Preview
**Goal**: Users can inspect what a preset contains before loading it, and are warned before overwriting unsaved config changes
**Depends on**: Phase 15
**Requirements**: PRST-02, PRST-03
**Success Criteria** (what must be TRUE):
  1. Hovering over a preset chip shows a popover listing the mapping names, trigger events covered, and sound count per mapping
  2. The popover appears within the viewport regardless of where the preset chip is positioned on screen
  3. When the user clicks Load on a preset and there are unsaved config changes, a confirmation dialog warns them the current config will be overwritten
  4. Dismissing the confirmation dialog cancels the preset load and leaves the current config intact
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → ... → 11 → 12 → 13 → 14 → 15 → 16

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
| 9. Delete API | v1.2 | 1/1 | Complete | 2026-02-24 |
| 10. Delete UI | v1.2 | 1/1 | Complete | 2026-02-24 |
| 11. Peon Cascade | v1.2 | 1/1 | Complete | 2026-02-24 |
| 12. Bundled Presets | v1.3 | 1/1 | Complete | 2026-02-24 |
| 13. Server Foundation | 1/1 | Complete    | 2026-02-24 | - |
| 14. Trigger Descriptions and Mapping Editor Polish | v1.3 | 0/1 | Not started | - |
| 15. Inline Sound Playback | v1.3 | 0/1 | Not started | - |
| 16. Preset Visual Preview | v1.3 | 0/1 | Not started | - |
