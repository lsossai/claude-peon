# Requirements: claude-peon

**Defined:** 2026-02-23
**Core Value:** Sounds play reliably in Claude Code sessions with zero manual config file editing — the web UI handles everything including hook installation.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

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

- [ ] **APLY-01**: Web UI Apply button writes hook entries into `~/.claude/settings.json`
- [ ] **APLY-02**: Apply uses atomic write (write to tmp, rename) to prevent corruption
- [ ] **APLY-03**: Apply reads existing settings.json and merges (does not overwrite other hooks)
- [ ] **APLY-04**: Apply validates written file by reading back and parsing
- [ ] **APLY-05**: Web UI Remove button cleanly strips claude-peon hooks from settings.json
- [ ] **APLY-06**: Apply shows "Restart Claude Code to activate" confirmation message
- [ ] **APLY-07**: User can choose global (~/.claude) vs project-scoped (.claude) hook installation

### Branding & Reproducibility

- [ ] **BRND-01**: All internal references renamed from openpeon/opencode to claude-peon/Claude Code
- [ ] **BRND-02**: `@opencode-ai/plugin` peer dependency removed from package.json
- [ ] **BRND-03**: `index.js` plugin entry point deleted (replaced by play.js)
- [ ] **BRND-04**: README rewritten with clone → run UI → pick sounds → Apply → restart flow
- [ ] **BRND-05**: Debug log path updated from `~/.config/opencode/` to claude-peon equivalent

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Events

- **EVNT-01**: PostToolUseFailure hook support (distinct error sound)
- **EVNT-02**: SubagentStop hook support (subagent completion sound)
- **EVNT-03**: SessionEnd hook support (goodbye sound)

### Quality

- **QUAL-01**: Config schema validation on load with user-friendly errors
- **QUAL-02**: Sound file existence check at startup with warnings
- **QUAL-03**: Sound playback concurrency limiting (prevent audio overlap)

### Documentation

- **DOCS-01**: Screenshots of config UI in README
- **DOCS-02**: Troubleshooting section in README
- **DOCS-03**: Video demo of setup flow

## Out of Scope

| Feature | Reason |
|---------|--------|
| MCP server integration | Hooks-only approach is simpler and sufficient; no runtime tools needed |
| npm package publishing | Clone-and-run is fine for v1; sound files need to be local |
| Linux/Windows audio | macOS only, matching current afplay dependency |
| CLI installation script | Web UI handles apply/deploy |
| Cross-platform audio libraries | Would add dependencies without proportionate value |

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
| APLY-01 | Phase 3 | Pending |
| APLY-02 | Phase 3 | Pending |
| APLY-03 | Phase 3 | Pending |
| APLY-04 | Phase 3 | Pending |
| APLY-05 | Phase 3 | Pending |
| APLY-06 | Phase 4 | Pending |
| APLY-07 | Phase 4 | Pending |
| BRND-01 | Phase 5 | Pending |
| BRND-02 | Phase 5 | Pending |
| BRND-03 | Phase 5 | Pending |
| BRND-04 | Phase 5 | Pending |
| BRND-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 after roadmap creation*
