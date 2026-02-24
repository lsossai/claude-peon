import { serve } from "bun"
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, rmSync, renameSync } from "fs"
import { resolve, join, extname, dirname } from "path"
import { homedir } from "os"

const ROOT = resolve(import.meta.dir, "..")
const CONFIG_PATH = resolve(ROOT, "claude-peon.json")
const SOUNDS_DIR = resolve(ROOT, "sounds")
const PRESETS_DIR = resolve(ROOT, "ui", "presets")
const UI_DIR = resolve(ROOT, "ui")

if (!existsSync(PRESETS_DIR)) {
  mkdirSync(PRESETS_DIR, { recursive: true })
}

const TRIGGER_TYPES = ["event", "tool.before", "tool.after"]

const EVENT_VALUES = [
  "Stop",
  "PreToolUse",
  "PostToolUse",
  "Notification",
  "SessionStart",
  "UserPromptSubmit",
]

const TOOL_VALUES = [
  "question",
  "bash",
  "read",
  "write",
  "edit",
  "glob",
  "grep",
  "task",
  "webfetch",
  "todowrite",
  "todoread",
  "skill",
]

const NOTIFICATION_TYPES = [
  "permission_prompt",
  "idle_prompt",
  "elicitation_dialog",
  "auth_success",
]

const PLAY_JS_PATH = resolve(ROOT, "play.js")

const PEON_EVENTS = [
  "Stop",
  "PreToolUse",
  "PostToolUse",
  "Notification",
  "SessionStart",
  "UserPromptSubmit",
]

const GLOBAL_SETTINGS_PATH = resolve(homedir(), ".claude", "settings.json")
const GLOBAL_DISPLAY_PATH = "~/.claude/settings.json"

function buildPeonGroup(nodePath) {
  return {
    _claude_peon: true,
    hooks: [
      {
        type: "command",
        command: `${nodePath} ${PLAY_JS_PATH}`,
        async: true,
      },
    ],
  }
}

function applyHooks(nodePath) {
  const settingsPath = GLOBAL_SETTINGS_PATH

  // 1. Ensure directory exists
  mkdirSync(dirname(settingsPath), { recursive: true })

  // 2. Read existing settings (throw loudly if corrupt — do not silently overwrite)
  let settings = {}
  if (existsSync(settingsPath)) {
    const raw = readFileSync(settingsPath, "utf8")
    settings = JSON.parse(raw) // throws on corrupt JSON — caller returns error response
  }

  // 3. Ensure hooks key exists as an object
  if (!settings.hooks || typeof settings.hooks !== "object") {
    settings.hooks = {}
  }

  // 4. For each peon event: strip stale peon groups (idempotent), then insert a fresh one
  for (const event of PEON_EVENTS) {
    if (!Array.isArray(settings.hooks[event])) {
      settings.hooks[event] = []
    }
    settings.hooks[event] = settings.hooks[event].filter((g) => !g._claude_peon)
    settings.hooks[event].push(buildPeonGroup(nodePath))
  }

  // 5. Atomic write: write to .tmp in the same directory, then rename over target
  const tmpPath = settingsPath + ".tmp"
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2), "utf8")
  renameSync(tmpPath, settingsPath)

  // 6. Validate: read back and parse to confirm a valid JSON file was written
  const written = JSON.parse(readFileSync(settingsPath, "utf8"))
  if (!written.hooks) throw new Error("Validation failed: hooks key missing after write")

  // 7. Clean up any orphaned peon hooks from project-local settings (best-effort)
  stripProjectPeonHooks()

  return { success: true, restartRequired: true, path: settingsPath, displayPath: GLOBAL_DISPLAY_PATH }
}

function removeHooks() {
  const settingsPath = GLOBAL_SETTINGS_PATH

  // Nothing to remove if the file doesn't exist
  if (!existsSync(settingsPath)) {
    // Still clean up project-local orphans even if global settings don't exist
    stripProjectPeonHooks()
    return { success: true, displayPath: GLOBAL_DISPLAY_PATH }
  }

  const raw = readFileSync(settingsPath, "utf8")
  const settings = JSON.parse(raw) // throws on corrupt JSON — caller returns error response

  // If there's no hooks key (or it's not an object), nothing to strip
  if (!settings.hooks || typeof settings.hooks !== "object") {
    stripProjectPeonHooks()
    return { success: true, displayPath: GLOBAL_DISPLAY_PATH }
  }

  // Strip peon groups from every event key in hooks (not just PEON_EVENTS —
  // a future version may have registered additional events)
  for (const event of Object.keys(settings.hooks)) {
    if (Array.isArray(settings.hooks[event])) {
      settings.hooks[event] = settings.hooks[event].filter((g) => !g._claude_peon)
      // Delete the event key entirely if no groups remain (no empty arrays)
      if (settings.hooks[event].length === 0) {
        delete settings.hooks[event]
      }
    }
  }

  // Delete the hooks key entirely if it is now empty
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks
  }

  // Atomic write: write to .tmp in the same directory, then rename over target
  const tmpPath = settingsPath + ".tmp"
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2), "utf8")
  renameSync(tmpPath, settingsPath)

  // Validate: read back and parse
  JSON.parse(readFileSync(settingsPath, "utf8"))

  // Clean up any orphaned peon hooks from project-local settings (best-effort)
  stripProjectPeonHooks()

  return { success: true, displayPath: GLOBAL_DISPLAY_PATH }
}

function stripProjectPeonHooks() {
  try {
    const projectSettingsPath = resolve(process.cwd(), ".claude", "settings.json")

    // Nothing to clean if the file doesn't exist
    if (!existsSync(projectSettingsPath)) return

    let settings
    try {
      const raw = readFileSync(projectSettingsPath, "utf8")
      settings = JSON.parse(raw)
    } catch {
      // Do not crash on corrupt project settings — best-effort cleanup
      return
    }

    // Nothing to strip if there are no hooks
    if (!settings.hooks || typeof settings.hooks !== "object") return

    // Strip peon groups from every event key in hooks
    for (const event of Object.keys(settings.hooks)) {
      if (Array.isArray(settings.hooks[event])) {
        settings.hooks[event] = settings.hooks[event].filter((g) => !g._claude_peon)
        if (settings.hooks[event].length === 0) {
          delete settings.hooks[event]
        }
      }
    }

    // Delete the hooks key entirely if now empty
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks
    }

    // Atomic write: write to .tmp in the same directory, then rename over target
    const tmpPath = projectSettingsPath + ".tmp"
    writeFileSync(tmpPath, JSON.stringify(settings, null, 2), "utf8")
    renameSync(tmpPath, projectSettingsPath)
  } catch {
    // Best-effort: silently ignore all errors
  }
}

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase()
  const types = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".wav": "audio/wav",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  }
  return types[ext] || "application/octet-stream"
}

function listSoundDirectories() {
  if (!existsSync(SOUNDS_DIR)) {
    return []
  }

  const entries = readdirSync(SOUNDS_DIR, { withFileTypes: true })
  const dirs = ["."]
  for (const entry of entries) {
    if (entry.isDirectory()) {
      dirs.push(entry.name)
    }
  }
  return dirs.sort((a, b) => {
    if (a === ".") return -1
    if (b === ".") return 1
    return a.localeCompare(b)
  })
}

function listSoundsInDirectory(dirName) {
  const targetDir = dirName === "." ? SOUNDS_DIR : join(SOUNDS_DIR, dirName)
  if (!existsSync(targetDir)) {
    return []
  }

  const entries = readdirSync(targetDir)
  return entries.filter((name) => name.endsWith(".wav") || name.endsWith(".mp3")).sort()
}

function listPresets() {
  if (!existsSync(PRESETS_DIR)) {
    return []
  }

  const entries = readdirSync(PRESETS_DIR)
  return entries.filter((name) => name.endsWith(".json")).map((name) => name.replace(".json", "")).sort()
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return { volume: 5, mappings: [] }
  }

  try {
    const contents = readFileSync(CONFIG_PATH, "utf8")
    return JSON.parse(contents)
  } catch {
    return { volume: 5, mappings: [] }
  }
}

function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

function loadPreset(name) {
  const presetPath = join(PRESETS_DIR, `${name}.json`)
  if (!existsSync(presetPath)) {
    return null
  }

  try {
    const contents = readFileSync(presetPath, "utf8")
    return JSON.parse(contents)
  } catch {
    return null
  }
}

function savePreset(name, config) {
  const presetPath = join(PRESETS_DIR, `${name}.json`)
  writeFileSync(presetPath, JSON.stringify(config, null, 2))
}


function handleApi(req) {
  const url = new URL(req.url)
  const path = url.pathname

  if (path === "/api/meta" && req.method === "GET") {
    return Response.json({
      triggerTypes: TRIGGER_TYPES,
      eventValues: EVENT_VALUES,
      toolValues: TOOL_VALUES,
      notificationTypes: NOTIFICATION_TYPES,
    })
  }

  if (path === "/api/config" && req.method === "GET") {
    return Response.json(loadConfig())
  }

  if (path === "/api/config" && req.method === "POST") {
    return req.json().then((body) => {
      saveConfig(body)
      return Response.json({ success: true })
    })
  }

  if (path === "/api/sounds/directories" && req.method === "GET") {
    return Response.json(listSoundDirectories())
  }

  if (path.startsWith("/api/sounds/list/") && req.method === "GET") {
    const dirName = decodeURIComponent(path.replace("/api/sounds/list/", ""))
    return Response.json(listSoundsInDirectory(dirName))
  }

  if (path.startsWith("/api/sounds/play/") && req.method === "GET") {
    const soundPath = decodeURIComponent(path.replace("/api/sounds/play/", ""))
    const fullPath = join(SOUNDS_DIR, soundPath)
    if (!existsSync(fullPath)) {
      return new Response("Not found", { status: 404 })
    }

    const file = readFileSync(fullPath)
    return new Response(file, {
      headers: { "Content-Type": "audio/wav" },
    })
  }

  if (path === "/api/presets" && req.method === "GET") {
    return Response.json(listPresets())
  }

  if (path.startsWith("/api/presets/") && req.method === "GET") {
    const name = decodeURIComponent(path.replace("/api/presets/", ""))
    const preset = loadPreset(name)
    if (!preset) {
      return new Response("Not found", { status: 404 })
    }
    return Response.json(preset)
  }

  if (path.startsWith("/api/presets/") && req.method === "POST") {
    const name = decodeURIComponent(path.replace("/api/presets/", ""))
    return req.json().then((body) => {
      savePreset(name, body)
      return Response.json({ success: true })
    })
  }

  if (path.startsWith("/api/presets/") && req.method === "DELETE") {
    const name = decodeURIComponent(path.replace("/api/presets/", ""))
    const presetPath = join(PRESETS_DIR, `${name}.json`)
    if (!existsSync(presetPath)) {
      return new Response("Not found", { status: 404 })
    }
    try {
      rmSync(presetPath)
      return Response.json({ success: true })
    } catch (error) {
      return Response.json({ success: false, error: error?.message ?? "Unknown error" })
    }
  }

  if (path === "/api/apply" && req.method === "POST") {
    return req.json().then(() => {
      const nodePath = Bun.which("node")
      if (!nodePath) {
        return Response.json({
          success: false,
          error: "Cannot resolve node binary. Install Node.js and ensure it is on your PATH when starting the UI server.",
        })
      }
      try {
        const result = applyHooks(nodePath)
        return Response.json(result)
      } catch (error) {
        return Response.json({ success: false, error: error?.message ?? "Unknown error" })
      }
    })
  }

  if (path === "/api/remove" && req.method === "POST") {
    return req.json().then(() => {
      try {
        const result = removeHooks()
        return Response.json(result)
      } catch (error) {
        return Response.json({ success: false, error: error?.message ?? "Unknown error" })
      }
    })
  }

  return new Response("Not found", { status: 404 })
}

function handleStatic(req) {
  const url = new URL(req.url)
  let path = url.pathname

  if (path === "/") {
    path = "/index.html"
  }

  const filePath = join(UI_DIR, path)
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return new Response("Not found", { status: 404 })
  }

  const file = readFileSync(filePath)
  return new Response(file, {
    headers: { "Content-Type": getMimeType(filePath) },
  })
}

const server = serve({
  port: 3456,
  fetch(req) {
    const url = new URL(req.url)
    if (url.pathname.startsWith("/api/")) {
      return handleApi(req)
    }
    return handleStatic(req)
  },
})

console.log(`UI server running at http://localhost:${server.port}`)
