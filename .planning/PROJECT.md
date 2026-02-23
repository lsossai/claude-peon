# claude-peon

## What This Is

A sound effects plugin for Claude Code that plays Warcraft and StarCraft audio cues in response to coding events — tool usage, messages, idle states. It's the spiritual successor to openpeon (built for opencode), rewritten to work natively with Claude Code's hooks system. Anyone should be able to clone the repo, open the config UI, pick their sounds, hit "Apply", and have peon sounds in their Claude Code sessions.

## Core Value

Sounds play reliably in Claude Code sessions with zero manual config file editing — the web UI handles everything including hook installation.

## Requirements

### Validated

- ✓ Event-driven sound mapping (triggers → sound files) — existing
- ✓ Preset system with multiple sound packs (WC2, WC3, SC:BW, SC2) — existing
- ✓ Web UI for configuring trigger-sound mappings — existing
- ✓ Volume control (1-10 scale with exponential curve) — existing
- ✓ macOS audio playback via afplay — existing
- ✓ Random preset selection on startup — existing
- ✓ Multiple sound packs included in repo — existing

### Active

- [ ] Replace @opencode-ai/plugin with Claude Code hooks system
- [ ] Web UI "Apply" button writes hooks into Claude Code settings
- [ ] Remove all opencode-specific code and references
- [ ] Rename all internal references from openpeon to claude-peon
- [ ] Update README with clear install/setup instructions for Claude Code users
- [ ] Make the project cloneable and usable by others in minutes

### Out of Scope

- MCP server integration — hooks-only approach is simpler and sufficient
- npm package publishing — clone-and-run is fine for v1
- Linux/Windows audio support — macOS only, matching current state
- CLI installation script — the web UI handles apply/deploy
- Tool registration (peon_list_presets etc.) — no MCP means no tools; UI manages everything

## Context

The project is a fork of openpeon, currently 100% opencode-compatible code. The conversion involves:

1. **Hook system replacement**: opencode uses a plugin API with `event`, `tool.execute.before`, `tool.execute.after` handlers. Claude Code uses hooks configured in `~/.claude/settings.json` (or project-level `.claude/settings.json`) with hook types like `PreToolUse`, `PostToolUse`, `Notification`, etc. Hooks are shell commands that run on events.

2. **Config deployment**: Currently deploys to `~/.config/opencode/plugins/`. Needs to write hook entries into Claude Code's settings JSON instead.

3. **Branding**: All references to "openpeon" and "opencode" need to become "claude-peon" and "Claude Code" — file names, config keys, debug paths, README, package.json.

4. **Reproducibility**: README needs clear steps: clone → run UI → pick sounds → click Apply → done. Screenshots of the config UI already exist.

Existing codebase is ~400 lines of JS (index.js) + ~300 lines (ui/server.js) + HTML/CSS for the config UI. All sound files are included in the repo.

## Constraints

- **Platform**: macOS only (afplay dependency) — document clearly, don't attempt cross-platform
- **Runtime**: Hooks are shell commands, so the sound-playing script must be invocable via shell (not a plugin API)
- **No MCP**: Hooks-only means no interactive tools — all config happens through the web UI
- **Claude Code settings format**: Hooks must conform to Claude Code's settings.json schema

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hooks-only, no MCP | Simpler setup, fewer moving parts, hooks are sufficient for sound triggers | — Pending |
| Web UI handles hook installation | Users shouldn't edit JSON manually; "Apply" button writes settings | — Pending |
| Keep all sound packs | Users want variety; repo size is acceptable | — Pending |
| Rename to claude-peon | Clear branding, matches repo name | — Pending |
| Clone-and-run, no npm package | Simpler distribution for v1; sound files need to be local anyway | — Pending |

---
*Last updated: 2026-02-23 after initialization*
