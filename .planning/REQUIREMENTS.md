# Requirements: claude-peon

**Defined:** 2026-02-23
**Core Value:** Sounds play reliably in Claude Code sessions with zero manual config file editing — the web UI handles everything including hook installation.

## v1.0 Requirements (Complete)

All v1.0 requirements shipped and validated.

### Hook Dispatcher

- [x] **HOOK-01**: Standalone `play.js` reads Claude Code hook stdin JSON and identifies the event type
- [x] **HOOK-02**: Dispatcher maps hook events to sound mappings from `claude-peon.json`
- [x] **HOOK-03**: Dispatcher spawns afplay asynchronously (never blocks Claude Code)
- [x] **HOOK-04**: Dispatcher supports Stop event (task complete sound)
- [x] **HOOK-05**: Dispatcher supports Notification event with permission/idle matchers
- [x] **HOOK-06**: Dispatcher supports SessionStart event (startup sound)
- [x] **HOOK-07**: Dispatcher supports UserPromptSubmit event (acknowledge sound)
- [x] **HOOK-08**: Dispatcher supports PreToolUse event (tool-before sound)
- [x] **HOOK-09**: Dispatcher supports PostToolUse event (tool-after sound)
- [x] **HOOK-10**: Dispatcher consumes stdin fully and exits 0 with no stdout output

### Config & Presets

- [x] **CONF-01**: Config file renamed from `openpeon.json` to `claude-peon.json`
- [x] **CONF-02**: Trigger types in default config migrated to Claude Code hook event names
- [x] **CONF-03**: All preset files migrated to Claude Code hook event names
- [x] **CONF-04**: Volume control preserved with exponential curve (1-10 scale)

### Apply/Deploy

- [x] **APLY-01**: Web UI Apply button writes hook entries into `~/.claude/settings.json`
- [x] **APLY-02**: Apply uses atomic write (write to tmp, rename) to prevent corruption
- [x] **APLY-03**: Apply reads existing settings.json and merges (does not overwrite other hooks)
- [x] **APLY-04**: Apply validates written file by reading back and parsing
- [x] **APLY-05**: Web UI Remove button cleanly strips claude-peon hooks from settings.json
- [x] **APLY-06**: Apply shows "Restart Claude Code to activate" confirmation message
- [x] **APLY-07**: User can choose global (~/.claude) vs project-scoped (.claude) hook installation

### Branding & Reproducibility

- [x] **BRND-01**: All internal references renamed from openpeon/opencode to claude-peon/Claude Code
- [x] **BRND-02**: `@opencode-ai/plugin` peer dependency removed from package.json
- [x] **BRND-03**: `index.js` plugin entry point deleted (replaced by play.js)
- [x] **BRND-04**: README rewritten with clone → run UI → pick sounds → Apply → restart flow
- [x] **BRND-05**: Debug log path updated from `~/.config/opencode/` to claude-peon equivalent

## v1.1 Requirements (Complete)

All v1.1 requirements shipped and validated.

### Playback

- [x] **PLAY-01**: play.js has #!/usr/bin/env node shebang as first line
- [x] **PLAY-02**: play.js executable bit (755) is committed to git
- [x] **PLAY-03**: Apply writes hook command with absolute node path (via Bun.which) instead of bare script path
- [x] **PLAY-04**: Apply returns clear error if node binary cannot be resolved

### Scope

- [x] **SCOP-01**: Server always targets ~/.claude/settings.json (no scope parameter)
- [x] **SCOP-02**: UI has no scope selector (radio buttons and related JS removed)
- [x] **SCOP-03**: Apply strips orphaned peon hooks from project-local .claude/settings.json if it exists

### Visibility

- [x] **VISI-01**: Server exposes GET /api/hooks returning all hooks from ~/.claude/settings.json
- [x] **VISI-02**: UI shows read-only Active Hooks panel on page load
- [x] **VISI-03**: Peon hooks visually distinguished from non-peon hooks in the panel

## v1.2 Requirements

Requirements for milestone v1.2: Delete Hooks from UI. Each maps to roadmap phases.

### Hook Deletion

- [x] **DEL-01**: User can delete any individual hook group from the Active Hooks panel via a delete button
- [x] **DEL-02**: User sees a confirmation dialog before deletion proceeds
- [x] **DEL-03**: Confirmation text distinguishes peon hooks (warns mapping will be removed) from external hooks
- [x] **DEL-04**: Active Hooks panel refreshes automatically after a successful deletion
- [x] **DEL-05**: User sees a toast notification confirming the hook was deleted

### File Safety

- [x] **SAFE-01**: saveConfig() uses atomic tmp+rename write pattern to prevent claude-peon.json corruption

### Peon Cascade

- [ ] **CASC-01**: Deleting a peon hook group removes the corresponding mapping from claude-peon.json
- [ ] **CASC-02**: When the last peon mapping is deleted, all peon hook groups are auto-stripped from settings.json

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Diagnostics

- **DIAG-01**: UI warns when installed peon command path is outdated (stale detection)
- **DIAG-02**: Test sound button fires play.js directly from UI to verify playback

### Enhanced Events

- **EVNT-01**: PostToolUseFailure hook support (distinct error sound)
- **EVNT-02**: SubagentStop hook support (subagent completion sound)
- **EVNT-03**: SessionEnd hook support (goodbye sound)

### Quality

- **QUAL-01**: Config schema validation on load with user-friendly errors
- **QUAL-02**: Sound file existence check at startup with warnings
- **QUAL-03**: Sound playback concurrency limiting (prevent audio overlap)

## Out of Scope

| Feature | Reason |
|---------|--------|
| MCP server integration | Hooks-only approach is simpler and sufficient |
| npm package publishing | Clone-and-run is fine; sound files must be local |
| Linux/Windows audio | macOS only, afplay dependency |
| Undo/restore deleted hooks | Disproportionate complexity; confirm dialog prevents accidents |
| Editing hooks inline | Separate feature; v1.2 is delete-only |
| Bulk delete (select multiple) | Single delete sufficient for typical 5-10 hook count |
| Reorder hooks | Not a deletion feature; hook order rarely matters |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOOK-01 | Phase 1 | Complete |
| HOOK-02 | Phase 1 | Complete |
| HOOK-03 | Phase 1 | Complete |
| HOOK-04 | Phase 1 | Complete |
| HOOK-05 | Phase 1 | Complete |
| HOOK-06 | Phase 1 | Complete |
| HOOK-07 | Phase 1 | Complete |
| HOOK-08 | Phase 1 | Complete |
| HOOK-09 | Phase 1 | Complete |
| HOOK-10 | Phase 1 | Complete |
| CONF-01 | Phase 2 | Complete |
| CONF-02 | Phase 2 | Complete |
| CONF-03 | Phase 2 | Complete |
| CONF-04 | Phase 2 | Complete |
| APLY-01 | Phase 3 | Complete |
| APLY-02 | Phase 3 | Complete |
| APLY-03 | Phase 3 | Complete |
| APLY-04 | Phase 3 | Complete |
| APLY-05 | Phase 3 | Complete |
| APLY-06 | Phase 4 | Complete |
| APLY-07 | Phase 4 | Complete |
| BRND-01 | Phase 5 | Complete |
| BRND-02 | Phase 5 | Complete |
| BRND-03 | Phase 5 | Complete |
| BRND-04 | Phase 5 | Complete |
| BRND-05 | Phase 5 | Complete |
| PLAY-01 | Phase 6 | Complete |
| PLAY-02 | Phase 6 | Complete |
| PLAY-03 | Phase 6 | Complete |
| PLAY-04 | Phase 6 | Complete |
| SCOP-01 | Phase 7 | Complete |
| SCOP-02 | Phase 7 | Complete |
| SCOP-03 | Phase 7 | Complete |
| VISI-01 | Phase 8 | Complete |
| VISI-02 | Phase 8 | Complete |
| VISI-03 | Phase 8 | Complete |
| DEL-01 | Phase 10 | Complete |
| DEL-02 | Phase 10 | Complete |
| DEL-03 | Phase 10 | Complete |
| DEL-04 | Phase 10 | Complete |
| DEL-05 | Phase 10 | Complete |
| SAFE-01 | Phase 9 | Complete |
| CASC-01 | Phase 11 | Pending |
| CASC-02 | Phase 11 | Pending |

**Coverage:**
- v1.0 requirements: 26 total (all complete)
- v1.1 requirements: 10 total (all complete)
- v1.2 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-24 after v1.2 roadmap creation*
