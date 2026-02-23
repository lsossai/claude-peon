# Coding Conventions

**Analysis Date:** 2026-02-23

## Naming Patterns

**Files:**
- Lowercase with hyphens for descriptive names: `server.js`
- Configuration files use descriptive names: `openpeon.json`
- Library/module entry points are lowercase: `index.js`

**Functions:**
- camelCase for all function names
- Prefix helper functions with descriptive verbs: `getSoundPath()`, `getRandomSound()`, `listPresets()`, `loadConfig()`, `saveConfig()`
- Event handlers use same naming convention: `fireEvent()`, `playSound()`, `playMappingSound()`
- UI functions follow action pattern: `addMapping()`, `removeMapping()`, `updateVolume()`, `renderMappings()`, `loadSoundDirs()`, `selectSoundDir()`, `filterSounds()`

**Variables:**
- camelCase for all variables
- Boolean variables may be prefixed with `is` or `has` or use simple boolean names: `audioDisabled`, `isDarwin`, `lastMessageId`, `selectedSoundFiles`
- Configuration variables use descriptive names: `DEFAULT_CONFIG`, `WHISPER_VOLUME`, `CONFIG_PATH`, `SOUNDS_DIR`, `PRESETS_DIR`
- Constants use SCREAMING_SNAKE_CASE: `DEFAULT_CONFIG`, `WHISPER_VOLUME`, `TRIGGER_TYPES`, `EVENT_VALUES`, `TOOL_VALUES`, `SOUNDS_DIR`, `CONFIG_PATH`, `PRESETS_DIR`

**Types/Objects:**
- JSON config objects follow flat structure with meaningful property names: `{ volume, mappings, randomPreset }`
- Mapping objects use consistent structure: `{ name, triggers, sounds, whisper }`
- Trigger objects follow type-specific structure: `{ type, event, role?, tool? }`
- No TypeScript types or JSDoc tags observed; plain JavaScript

## Code Style

**Formatting:**
- No explicit formatter configured (ESLint/Prettier not detected)
- Observed patterns:
  - 2-space indentation
  - Line length varies (examples show 80+ characters)
  - Consistent spacing around operators and after keywords

**Linting:**
- No ESLint configuration detected
- Code relies on manual style consistency

**Semicolons:**
- Semicolons used consistently at end of statements
- No optional semicolon style observed

## Import Organization

**Order in Node.js modules:**
1. Built-in Node.js modules (path, fs, os, child_process, url)
2. Third-party packages (@opencode-ai/plugin, bun)
3. Local imports (none observed in this codebase)

**Examples from `index.js`:**
```javascript
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { existsSync, appendFile, readFileSync, readdirSync } from "fs"
import { spawn } from "child_process"
import { homedir } from "os"
import { tool } from "@opencode-ai/plugin"
```

**Examples from `ui/server.js`:**
```javascript
import { serve } from "bun"
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, cpSync, rmSync } from "fs"
import { resolve, join, extname } from "path"
import { homedir } from "os"
```

**Path Aliases:**
- Not used; absolute paths via `import.meta.dir` and `import.meta.url`
- Pattern: `const ROOT = resolve(import.meta.dir, "..")`

## Error Handling

**Patterns:**
- Try-catch blocks for file I/O and JSON parsing: see `loadConfig()`, `loadPreset()`, `deployPlugin()` in `index.js`
- Silent failures with debug logging: caught errors logged via `logDebug()` rather than thrown
- Fallback values on error: `loadConfig()` returns `DEFAULT_CONFIG` on parse failure
- Null returns for missing resources: `loadPreset()` returns `null` if preset not found

**Example pattern from `index.js` lines 63-75:**
```javascript
try {
  const contents = readFileSync(configPath, "utf8")
  const parsed = JSON.parse(contents)
  if (!parsed || !Array.isArray(parsed.mappings)) {
    logDebug("config-invalid", { reason: "missing-mappings" })
    return DEFAULT_CONFIG
  }
  return parsed
} catch (error) {
  logDebug("config-error", { message: error?.message ?? "unknown" })
  return DEFAULT_CONFIG
}
```

**API error handling pattern from `ui/server.js` lines 193-278:**
```javascript
// 404 for missing resources
return new Response("Not found", { status: 404 })

// JSON error responses
return Response.json({ success: false, error: error?.message ?? "Unknown error" })

// Try-catch for file operations
try {
  rmSync(presetPath)
  return Response.json({ success: true })
} catch (error) {
  return Response.json({ success: false, error: error?.message ?? "Unknown error" })
}
```

**JavaScript UI error handling (index.html lines 805-816):**
```javascript
try {
  const res = await fetch(`/api/presets/${encodeURIComponent(name)}`, { method: "DELETE" })
  const result = await res.json()
  if (result.success) {
    showToast(`Deleted preset: ${name}`, "success")
    await loadPresets()
  } else {
    showToast(`Failed to delete: ${result.error}`, "error")
  }
} catch (err) {
  showToast(`Delete error: ${err.message}`, "error")
}
```

## Logging

**Framework:**
- No logging library used
- Custom `logDebug()` function with conditional file logging to `~/.config/opencode/openpeon-debug.log`

**Pattern from `index.js` lines 111-118:**
```javascript
const logDebug = (message, extra) => {
  if (!debug) {
    return
  }
  const line = `${new Date().toISOString()} ${message}${extra ? ` ${JSON.stringify(extra)}` : ""}\n`
  appendFile(debugLogPath, line, () => {})
}
```

**UI logging pattern (index.html):**
- Toast notifications for user feedback: `showToast(message, type)` with "success" or "error" types
- No console logging observed in production code

**Debug log patterns:**
- Format: timestamp, message, optional JSON metadata
- Examples: `"initialized"`, `"disabled"`, `"config-missing"`, `"mapping-play"`, `"event:..."`, `"tool.execute.before"`
- Condition: Only logs if `process.env.OPENPEON_DEBUG` is truthy

## Comments

**When to Comment:**
- Complex algorithms explained inline (see `index.js` lines 143-147 explaining volume curve)
- Configuration intentions documented above constant definitions
- Event/trigger type explanations in UI code (index.html)

**JSDoc/TSDoc:**
- Not used; no type annotations or formal documentation
- Plain JavaScript without formal doc comments

**Inline Comments:**
- Short explanations for non-obvious logic
- Example from `index.js` lines 143-147:
```javascript
// Convert volume 1-10 to afplay volume 0-1 with exponential curve
// This makes perceived loudness feel linear to human ears
const effectiveVolume = whisper ? WHISPER_VOLUME : volume
const normalized = effectiveVolume / 10
const afplayVolume = Math.pow(normalized, 2)
```

## Function Design

**Size:**
- Functions typically 5-30 lines
- Larger functions (50+ lines) are event handlers or complex workflows
- Example: `OpenPeonPlugin` async function (lines 107-406) contains initialization logic and event handler definitions

**Parameters:**
- Minimal parameters; most functions take 0-2 arguments
- Objects passed as single parameter when multiple values needed
- Example: `loadPreset(presetsDir, presetName)` vs. config object with all settings

**Return Values:**
- Functions return null for missing resources
- Functions return objects/arrays for success cases
- Event handler functions return via side effects (logging, UI updates, config mutations)
- Promise-based functions return JSON responses in API handlers

**Example patterns:**
- Validator functions return boolean or filtered arrays
- Loader functions return objects or null: `loadPreset()`, `loadConfig()`
- Renderer functions return strings (HTML) or void (DOM mutations)

## Module Design

**Exports:**
- Named exports for plugin definition: `export const OpenPeonPlugin = async ({ client }) => {...}`
- No barrel files or re-exports

**Single Responsibility:**
- `index.js`: Plugin core logic, event handling, config loading
- `ui/server.js`: HTTP API server, file serving, preset management
- `ui/index.html`: UI markup, styling, client-side state management

**Plugin Pattern (`index.js`):**
```javascript
export const OpenPeonPlugin = async ({ client }) => {
  // initialization

  return {
    event: ({ event }) => {},          // event handler
    "tool.execute.before": async (input) => {},  // tool hook
    "tool.execute.after": async (input) => {},   // tool hook
    tool: {
      peon_list_presets: tool({...}),   // tool definitions
      peon_switch_preset: tool({...}),
      peon_current_config: tool({...}),
      peon_set_volume: tool({...}),
    }
  }
}
```

**API Route Pattern (`ui/server.js`):**
```javascript
function handleApi(req) {
  const url = new URL(req.url)
  const path = url.pathname

  if (path === "/api/..." && req.method === "GET") { ... }
  if (path === "/api/..." && req.method === "POST") { ... }
  if (path === "/api/..." && req.method === "DELETE") { ... }

  return new Response("Not found", { status: 404 })
}
```

---

*Convention analysis: 2026-02-23*
