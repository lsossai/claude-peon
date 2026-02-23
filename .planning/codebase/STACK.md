# Technology Stack

**Analysis Date:** 2026-02-23

## Languages

**Primary:**
- JavaScript (ES modules) - Core plugin code and UI server

## Runtime

**Environment:**
- Bun - JavaScript runtime and package manager (for UI server)
- Node.js compatible - Plugin runs in OpenCode runtime (macOS)

**Package Manager:**
- Bun (for development and UI server)
- Lockfile: Not detected (lightweight peer dependency model)

## Frameworks

**Core:**
- @opencode-ai/plugin - Plugin system framework for OpenCode integration

**Web Server:**
- Bun's native `serve()` - Lightweight HTTP server for config UI (port 3456)

**Build/Dev:**
- No bundler detected - Uses native ES modules directly

## Key Dependencies

**Critical:**
- @opencode-ai/plugin (peer dependency) - Provides plugin hooks (`event`, `tool.execute.before`, `tool.execute.after`) and tool API for registering custom tools

**System Dependencies:**
- afplay (macOS only) - Audio playback utility bundled with macOS, used to play sound files
- Node.js fs module - File system operations for config and preset management
- Node.js child_process.spawn() - Spawning afplay process for audio playback
- Node.js path module - Path resolution for sound files and config directories

## Configuration

**Environment:**
- Environment-based debug mode: `OPENPEON_DEBUG=1`
- Debug logs written to `~/.config/opencode/openpeon-debug.log`

**Runtime Config:**
- `openpeon.json` - Main configuration file located at project root, contains volume level, preset settings, and event/tool trigger mappings
- Per-preset configs - JSON files in `ui/presets/` directory (e.g., `wc2-peon.json`, `wc3-peasant.json`)
- User plugin deployment at `~/.config/opencode/plugins/openpeon/`

**Build:**
- No explicit build config needed - ES modules used directly
- Entry point: `index.js` exports `OpenPeonPlugin` async function
- UI server: `ui/server.js` (run via `bun run ui`)

## Platform Requirements

**Development:**
- macOS (required - uses afplay for audio)
- Bun runtime (for running config UI server)
- Sound files included in repository (multiple formats: .wav, .mp3)

**Production:**
- Deployment target: OpenCode plugin system
- Plugin deployed to `~/.config/opencode/plugins/openpeon/` directory
- Requires macOS environment (audio playback via afplay)
- Auto-disables gracefully on non-macOS platforms

## Audio & Multimedia

**Audio Format Support:**
- WAV (.wav) - Primary sound format
- MP3 (.mp3) - Secondary format supported

**Sound Libraries:**
- Warcraft II (Horde and Alliance units, buildings, UI sounds)
- Warcraft III (Peasant voice lines)
- StarCraft: Brood War (Terran, Protoss, Zerg units)
- StarCraft 2 (Terran, Protoss, Zerg units)

**Audio Playback:**
- macOS `afplay` command-line tool for audio output
- Volume control via exponential curve normalization (1-10 scale)
- Detached process spawning for non-blocking playback

---

*Stack analysis: 2026-02-23*
