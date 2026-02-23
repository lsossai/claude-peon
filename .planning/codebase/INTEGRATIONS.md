# External Integrations

**Analysis Date:** 2026-02-23

## Platform Integration

**OpenCode Plugin System:**
- Purpose: Provides event lifecycle hooks and tool execution context
- SDK/Client: @opencode-ai/plugin (peer dependency in `package.json`)
- Integration points:
  - `event` hook - Listens to OpenCode lifecycle events (session.idle, message.updated, permission.asked, etc.)
  - `tool.execute.before` hook - Fires before tool execution (bash, read, write, edit, grep, glob, etc.)
  - `tool.execute.after` hook - Fires after tool execution
  - Tool API - Registers custom tools accessible from OpenCode chat

## Event System

**Events Emitted by OpenCode (consumed):**
- Command Events: `command.executed`, `tui.command.execute`
- File Events: `file.edited`, `file.watcher.updated`
- Installation Events: `installation.updated`
- LSP Events: `lsp.client.diagnostics`, `lsp.updated`
- Message Events: `message.updated`, `message.part.updated`, `message.removed`, `message.part.removed`
- Permission Events: `permission.asked`, `permission.replied`
- Server Events: `server.connected`
- Session Events: `session.created`, `session.compacted`, `session.deleted`, `session.diff`, `session.error`, `session.idle`, `session.status`, `session.updated`
- Todo Events: `todo.updated`
- TUI Events: `tui.prompt.append`, `tui.toast.show`
- Custom Events: `openpeon.startup`

**Tools Monitored (tool.before/tool.after triggers):**
- question, bash, read, write, edit, glob, grep, task, webfetch, todowrite, todoread, skill

## Custom Tools Exported

**From Plugin:**
- `peon_list_presets` - Lists available sound presets
- `peon_switch_preset` - Switches to different preset at runtime
- `peon_current_config` - Displays current configuration and active mappings
- `peon_set_volume` - Adjusts volume level (1-10 scale)

## System Integration

**Audio Playback:**
- Service: macOS `afplay` command-line utility
- Path: `/usr/bin/afplay` (detected via Bun.which or fallback)
- Invocation: `spawn(afplayPath, ["-v", volumeLevel, soundPath])`
- Purpose: Play .wav and .mp3 audio files based on trigger events
- Graceful fallback: Plugin auto-disables on non-macOS platforms

## Configuration Storage

**Local File System:**
- Main config: `openpeon.json` (project root)
  - Location: Resolved from `__dirname` at runtime
  - Purpose: Stores volume, preset settings, and event/tool trigger mappings

- Preset configurations: `ui/presets/*.json`
  - Location: Subdirectory from project root
  - Purpose: Pre-configured sound mapping profiles (wc2-peon, wc3-peasant, scbw-scv, wc2-ogre-mage)

- User config deployment: `~/.config/opencode/plugins/openpeon/openpeon.json`
  - Location: User's home directory OpenCode plugins folder
  - Purpose: Active configuration used when plugin runs in OpenCode

- Debug logs: `~/.config/opencode/openpeon-debug.log`
  - Location: User's OpenCode config directory
  - Purpose: Debug output when `OPENPEON_DEBUG=1` is set

**Sound Assets:**
- Location: `sounds/` directory with subdirectories by source game
- Directories: wc2-horde/, wc2-alliance/, wc3-peasant/, scbw-terran/, scbw-protoss/, scbw-zerg/, sc2-terran/, sc2-protoss/, sc2-zerg/, scbw-misc/
- File types: .wav (primary), .mp3 (secondary)
- Deployment: Copied to `~/.config/opencode/plugins/openpeon/sounds/` during plugin deployment

## Web UI

**Configuration Interface:**
- Server: Bun HTTP server at `http://localhost:3456`
- Port: 3456 (hardcoded in `ui/server.js`)
- Run command: `bun run ui`
- Static files: Served from `ui/` directory

**API Endpoints (internal):**
- `GET /api/meta` - Returns available trigger types, events, and tools
- `GET /api/config` - Load current config from openpeon.json
- `POST /api/config` - Save updated config
- `GET /api/sounds/directories` - List sound library directories
- `GET /api/sounds/list/{directory}` - List sounds in directory
- `GET /api/sounds/play/{path}` - Stream audio file for preview
- `GET /api/presets` - List available presets
- `GET /api/presets/{name}` - Load preset configuration
- `POST /api/presets/{name}` - Save new or update preset
- `DELETE /api/presets/{name}` - Delete preset
- `POST /api/deploy` - Deploy plugin to OpenCode plugins directory

**UI Features:**
- Volume adjustment (1-10 scale with exponential curve)
- Random preset toggle on startup
- Mapping editor (add/remove/edit trigger-to-sound mappings)
- Per-mapping whisper mode toggle
- Sound browser and preview
- Preset management (load/save/delete)
- Direct deployment to OpenCode plugin directory

## Deployment Integration

**Plugin Deployment Mechanism:**
- Source: `index.js`, `openpeon.json`, `sounds/`, `ui/presets/`
- Target: `~/.config/opencode/plugins/openpeon/`
- Loader: `~/.config/opencode/plugins/openpeon.js` (export wrapper)
- Content copied:
  - `index.js` → plugin entry point
  - `openpeon.json` → active configuration
  - `sounds/` → all audio assets (recursive)
  - `presets/` → preset configurations (recursive)

**Plugin Discovery:**
- OpenCode reads `~/.config/opencode/plugins/` directory
- Loader file `openpeon.js` exports `OpenPeonPlugin` function
- Plugin initializes with OpenCode client on startup

## Dependencies & Peer Requirements

**Peer Dependencies:**
- @opencode-ai/plugin * (any version) - Required by OpenCode to load plugin

**No External APIs:**
- Plugin is self-contained
- No network requests to external services
- No remote API integrations
- No authentication providers required

**No Database:**
- All state stored in JSON files (openpeon.json, presets)
- File-based persistence only

**No Webhooks:**
- Plugin responds to OpenCode internal events only
- No incoming webhooks
- No outgoing webhooks to external services

---

*Integration audit: 2026-02-23*
