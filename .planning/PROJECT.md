# claude-peon

## What This Is

A sound effects plugin for Claude Code that plays Warcraft and StarCraft audio cues in response to coding events — tool usage, messages, idle states. It's the spiritual successor to openpeon (built for opencode), rewritten to work natively with Claude Code's hooks system. Anyone should be able to clone the repo, open the config UI, pick their sounds, hit "Apply", and have peon sounds in their Claude Code sessions.

## Core Value

Sounds play reliably in Claude Code sessions with zero manual config file editing — the web UI handles everything including hook installation.

## Requirements

### Validated

- ✓ Event-driven sound mapping (triggers → sound files) — v1.0
- ✓ Preset system with multiple sound packs (WC2, WC3, SC:BW, SC2) — v1.0
- ✓ Web UI for configuring trigger-sound mappings — v1.0
- ✓ Volume control (1-10 scale with exponential curve) — v1.0
- ✓ macOS audio playback via afplay — v1.0
- ✓ Random preset selection on startup — v1.0
- ✓ Multiple sound packs included in repo — v1.0
- ✓ Replace @opencode-ai/plugin with Claude Code hooks system — v1.0
- ✓ Web UI "Apply" button writes hooks into Claude Code settings — v1.0
- ✓ Remove all opencode-specific code and references — v1.0
- ✓ Rename all internal references from openpeon to claude-peon — v1.0
- ✓ Update README with clear install/setup instructions for Claude Code users — v1.0
- ✓ Make the project cloneable and usable by others in minutes — v1.0
- ✓ Fix sound playback (absolute node path, executable bit) — v1.1
- ✓ Global-only config (remove project scope, always target ~/.claude/settings.json) — v1.1
- ✓ UI loads existing hooks from ~/.claude/settings.json on open (peon and external) — v1.1

### Active

- [ ] Delete any hook (peon or external) from the Active Hooks panel in the UI
- [ ] Deleting an external hook removes it from ~/.claude/settings.json
- [ ] Deleting a peon hook removes it from both settings.json and the peon mapping config
- [ ] Active Hooks panel refreshes after deletion

### Out of Scope

- MCP server integration — hooks-only approach is simpler and sufficient
- npm package publishing — clone-and-run is fine for v1
- Linux/Windows audio support — macOS only, matching current state
- CLI installation script — the web UI handles apply/deploy
- Tool registration (peon_list_presets etc.) — no MCP means no tools; UI manages everything

## Current Milestone: v1.2 Delete Hooks from UI

**Goal:** Let users delete any hook directly from the Active Hooks panel — both peon-installed and external hooks.

**Target features:**
- Delete buttons on every hook in the Active Hooks panel
- External hook deletion removes from ~/.claude/settings.json
- Peon hook deletion removes from both settings.json and peon mapping config
- Panel refreshes after deletion

## Context

The v1.0 conversion from openpeon is complete — hooks, config, UI, branding all done. The codebase is ~170 lines (play.js) + ~395 lines (ui/server.js) + HTML/CSS for the config UI. All sound files included in repo.

Current issues discovered post-v1.0:
1. play.js has no shebang and isn't executable — Claude Code can't invoke it as a bare path
2. Project scope selector adds complexity nobody uses — global is the only real use case
3. Opening the UI shows only peon config, not the actual hooks in ~/.claude/settings.json (e.g., hand-crafted afplay hooks, ruff-format, etc.)

## Constraints

- **Platform**: macOS only (afplay dependency) — document clearly, don't attempt cross-platform
- **Runtime**: Hooks are shell commands, so the sound-playing script must be invocable via shell (not a plugin API)
- **No MCP**: Hooks-only means no interactive tools — all config happens through the web UI
- **Claude Code settings format**: Hooks must conform to Claude Code's settings.json schema

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hooks-only, no MCP | Simpler setup, fewer moving parts, hooks are sufficient for sound triggers | ✓ Good |
| Web UI handles hook installation | Users shouldn't edit JSON manually; "Apply" button writes settings | ✓ Good |
| Keep all sound packs | Users want variety; repo size is acceptable | ✓ Good |
| Rename to claude-peon | Clear branding, matches repo name | ✓ Good |
| Clone-and-run, no npm package | Simpler distribution for v1; sound files need to be local anyway | ✓ Good |
| Global-only scope | Project scope adds complexity; global hooks are the real use case | — Pending |

---
*Last updated: 2026-02-24 after milestone v1.2 start*
