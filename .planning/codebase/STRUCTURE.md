# Codebase Structure

**Analysis Date:** 2026-02-23

## Directory Layout

```
/Users/lucassossai/dev/pessoal/claude-peon/
├── index.js                         # Main plugin export and event handler logic
├── openpeon.json                    # Current plugin configuration (volume, mappings)
├── package.json                     # NPM manifest (ESM, peer deps on @opencode-ai/plugin)
├── ui/                              # Web UI for configuration management
│   ├── server.js                    # Bun HTTP server, REST API, deployment logic
│   ├── index.html                   # Web UI frontend (served via server.js)
│   ├── favicon.ico                  # UI icon
│   ├── favicon-16.png              # UI icon variant
│   ├── favicon-32.png              # UI icon variant
│   ├── apple-touch-icon.png        # iOS home screen icon
│   ├── peon.png                     # Logo/image asset
│   ├── screenshot-v2.png            # UI screenshot for documentation
│   └── presets/                     # Preset configuration files
│       ├── wc2-peon.json            # Warcraft II Horde peon preset
│       ├── wc2-ogre-mage.json       # Warcraft II ogre preset
│       ├── wc3-peasant.json         # Warcraft III peasant preset
│       └── scbw-scv.json            # StarCraft: Brood War SCV preset
└── sounds/                          # Audio asset directories
    ├── wc2-alliance/                # Warcraft II Alliance unit sounds
    ├── wc2-horde/                   # Warcraft II Horde unit sounds
    ├── wc3-peasant/                 # Warcraft III peasant unit sounds
    ├── sc2-protoss/                 # StarCraft II Protoss unit sounds
    ├── sc2-terran/                  # StarCraft II Terran unit sounds
    ├── sc2-zerg/                    # StarCraft II Zerg unit sounds
    ├── scbw-protoss/                # StarCraft: Brood War Protoss sounds
    ├── scbw-terran/                 # StarCraft: Brood War Terran sounds
    ├── scbw-zerg/                   # StarCraft: Brood War Zerg sounds
    └── scbw-misc/                   # StarCraft: Brood War miscellaneous sounds
```

## Directory Purposes

**Root Directory:**
- Purpose: Plugin entry point and main configuration
- Contains: Plugin code, package manifest, default configuration
- Key files: `index.js` (main), `package.json` (metadata), `openpeon.json` (config)

**`ui/` Directory:**
- Purpose: Web-based configuration UI and server
- Contains: Bun HTTP server, static HTML/CSS/JS frontend, preset definitions, deployment logic
- Key files: `server.js` (REST API), `index.html` (frontend), preset JSONs

**`ui/presets/` Directory:**
- Purpose: Store predefined sound mapping configurations
- Contains: JSON files, each defining a complete configuration with volume and mappings
- Committed to git: Yes (example configurations)
- Generated: No (user-created via UI or manually)
- Key files: `wc2-peon.json`, `wc3-peasant.json`, `scbw-scv.json`, `wc2-ogre-mage.json`

**`sounds/` Directory:**
- Purpose: Asset repository for all audio files referenced in mappings
- Contains: Subdirectories organized by game source and faction
- Committed to git: No (large .wav/.mp3 files in .gitignore)
- Generated: No (sourced from original games)

**Sound Category Directories:**
- `wc2-alliance/`: Alliance unit voices (e.g., `buildings-blacksmith.wav`)
- `wc2-horde/`: Horde unit voices (e.g., `basic-orc-voices-acknowledge-1.wav`)
- `wc3-peasant/`: Peasant unit voices (e.g., `peasant-acknowledge-1.wav`)
- `sc2-protoss/`, `sc2-terran/`, `sc2-zerg/`: StarCraft II unit sounds
- `scbw-protoss/`, `scbw-terran/`, `scbw-zerg/`: StarCraft: Brood War original unit sounds
- `scbw-misc/`: Miscellaneous StarCraft sounds

## Key File Locations

**Entry Points:**

- `index.js`: Main plugin entry point. Exports `OpenPeonPlugin` async function that returns event handlers and tools. Called by OpenCode runtime during plugin initialization.
- `ui/server.js`: Web UI server entry point. Runs on port 3456. Started with `bun run ui/server.js`.

**Configuration:**

- `openpeon.json`: Active plugin configuration. Structure: `{ volume: 1-10, mappings: [...], randomPreset?: boolean }`. Loaded at plugin init; updated by tools (`peon_set_volume`) or Web UI API.
- `ui/presets/*.json`: Preset configurations. Same structure as openpeon.json. Loaded by `loadPreset()` function or selected randomly at startup.
- `package.json`: NPM metadata. Defines peer dependency on `@opencode-ai/plugin`.

**Core Logic:**

- `index.js`: Contains all core plugin logic:
  - Lines 10-42: DEFAULT_CONFIG constant
  - Lines 44-105: Helper functions (getSoundPath, getRandomSound, loadConfig, listPresets, loadPreset)
  - Lines 107-406: Plugin factory function OpenPeonPlugin (initialization, event handlers, tools)
  - Lines 138-167: Audio playback (playSound)
  - Lines 196-237: Event/trigger matching logic
  - Lines 325-404: Tool definitions for Claude

- `ui/server.js`: Web UI server:
  - Lines 18-73: Metadata constants (TRIGGER_TYPES, EVENT_VALUES, TOOL_VALUES)
  - Lines 75-87: MIME type mapping
  - Lines 89-161: Configuration file operations (load/save config, presets)
  - Lines 163-191: Deployment logic (copyPlugin)
  - Lines 193-279: API route handlers
  - Lines 281-298: Static file serving
  - Lines 300-311: Server initialization

**Testing:**
- Not present (no test files detected)

## Naming Conventions

**Files:**

- Main files: `index.js`, `server.js` (no prefixes)
- Configuration: `openpeon.json`, `{preset-name}.json` (lowercase, kebab-case, .json)
- Sound assets: `{unit-type}-{action}-{variant}.wav` or `{unit-type}-{action}-{variant}.mp3`
  - Examples: `peasant-acknowledge-1.wav`, `basic-orc-voices-annoyed-3.wav`, `buildings-blacksmith.wav`

**Directories:**

- Sound categories: `{game}-{faction/type}` format (lowercase, kebab-case)
  - Examples: `wc2-alliance`, `sc2-protoss`, `scbw-terran`
- Preset directory: `presets` (lowercase)

**Variables (JavaScript):**

- Camel case for all variables: `audioDisabled`, `currentPreset`, `debugLogPath`, `afplayPath`
- Constants: SCREAMING_SNAKE_CASE for module-level constants: `DEFAULT_CONFIG`, `WHISPER_VOLUME`, `TRIGGER_TYPES`, `SOUNDS_DIR`, `DEPLOY_DIR`
- Paths: `*Path` suffix for file paths: `configPath`, `presetsDir`, `soundPath`, `debugLogPath`
- Directories: `*Dir` suffix for directory paths: `presetsDir`, `SOUNDS_DIR`, `PRESETS_DIR`

**Functions:**

- Camel case: `getSoundPath()`, `getRandomSound()`, `loadConfig()`, `playSound()`, `matchesEventTrigger()`
- Verb-first naming: `load*`, `play*`, `list*`, `save*`, `deploy*`

**Configuration Structure:**

- JSON property names: camelCase: `volume`, `mappings`, `randomPreset`, `whisper`, `triggers`, `sounds`
- Trigger types: lowercase: `"event"`, `"tool.before"`, `"tool.after"`
- Event names: lowercase with dots: `"message.updated"`, `"session.idle"`, `"permission.asked"`

## Where to Add New Code

**New Sound Mapping:**
1. Place sound files in appropriate `sounds/{category}/` directory
2. Edit `openpeon.json` or create new preset in `ui/presets/{name}.json`
3. Add new mapping object to `mappings` array with trigger and sounds references

**New Event Trigger Type:**
1. Add event name to `EVENT_VALUES` constant in `ui/server.js` (line 20-58)
2. Event matching already handled by generic `matchesEventTrigger()` logic in `index.js` (lines 207-221)
3. No code changes needed in plugin core if trigger type is "event"

**New Tool Trigger:**
1. Add tool name to `TOOL_VALUES` constant in `ui/server.js` (line 60-73)
2. Add trigger objects with `type: "tool.before"` or `type: "tool.after"` and target `tool` name to mappings

**New Plugin Tool (Claude-callable):**
1. Add tool definition in `OpenPeonPlugin` return object, `tool` property (e.g., lines 325-404 as examples)
2. Use `tool()` wrapper from `@opencode-ai/plugin` package
3. Define with: `description`, `args` object with schema definitions, `execute()` async function
4. Return string result visible to Claude

**Web UI Feature:**
1. Add route handler in `ui/server.js` in `handleApi()` function (lines 193-279)
2. Handle both request and response
3. Return `Response.json()` for JSON or `new Response()` for files
4. Update frontend JavaScript in `ui/index.html` to call new endpoint

**Utilities for Plugin:**
- Current structure: All plugin utilities in single `index.js` file
- Helper functions at module level (getSoundPath, loadConfig, etc.) are available to entire plugin
- If splitting: Create separate .js modules and import using ES6 imports at top of file

**Presets:**
- Add new preset: Create `ui/presets/{unique-name}.json` with config structure
- Copy from existing preset and modify mappings/volume
- Auto-discovered by `listPresets()` function; no registration needed

## Special Directories

**`.planning/` Directory:**
- Purpose: GSD planning documents
- Generated: Yes (by GSD tools)
- Committed: Yes (for project planning reference)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md, STACK.md, INTEGRATIONS.md

**`.claude/` Directory:**
- Purpose: Project-specific Claude configuration and hooks
- Generated: No (manually created)
- Committed: Yes
- Contains: Custom GSD agents, commands, hooks

**`sounds/` Subdirectories:**
- Purpose: Audio asset organization
- Generated: No
- Committed: No (in .gitignore; large binary files)
- Note: Must exist for plugin to function; populate with game audio files

---

*Structure analysis: 2026-02-23*
