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
- ✓ Delete any hook (peon or external) from the Active Hooks panel — v1.2
- ✓ Peon cascade: deleting peon mapping removes from both config and settings.json — v1.2
- ✓ saveConfig() atomic writes (tmp + rename) — v1.2

### Active

- [ ] Trigger tooltips explaining when each event fires in Claude Code
- [ ] Preset visual preview showing mapped sounds before loading
- [ ] Bundled presets for all sound packs (WC2 Horde, WC2 Alliance, WC3 Peasant, SC:BW, SC2)
- [ ] Mapping editor UX improvements (cleaner layout, less clunky add/edit flow)
- [ ] More prominent sound playback in the config UI

### Out of Scope

- MCP server integration — hooks-only approach is simpler and sufficient
- npm package publishing — clone-and-run is fine for v1
- Linux/Windows audio support — macOS only, matching current state
- CLI installation script — the web UI handles apply/deploy
- Tool registration (peon_list_presets etc.) — no MCP means no tools; UI manages everything

## Current Milestone: v1.3 Config UX Polish

**Goal:** Make the config UI intuitive — users understand triggers, preview sounds, load presets confidently, and edit mappings without friction.

**Target features:**
- Trigger tooltips/descriptions explaining when each event fires
- Preset cards with visual preview of mapped sounds
- Bundled presets for all included sound packs
- Cleaner mapping editor UX
- More prominent sound playback throughout the UI

## Context

The v1.0 conversion from openpeon is complete — hooks, config, UI, branding all done. The codebase is ~170 lines (play.js) + ~395 lines (ui/server.js) + HTML/CSS for the config UI. All sound files included in repo.

Post-v1.2 state: All core functionality works — sound playback, config management, hook apply/remove/delete. The UX needs polish: triggers are opaque (users don't know when events fire), presets feel disconnected from the config experience, and the mapping editor has rough edges.

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
| Global-only scope | Project scope adds complexity; global hooks are the real use case | ✓ Good |

---
*Last updated: 2026-02-24 after milestone v1.3 start*
