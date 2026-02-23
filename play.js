import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { existsSync, readFileSync, appendFileSync } from "fs"
import { spawn } from "child_process"
import { homedir } from "os"

const __dirname = dirname(fileURLToPath(import.meta.url))

const CONFIG_PATH = resolve(__dirname, "claude-peon.json")
const SOUNDS_DIR = resolve(__dirname, "sounds")
const DEBUG = Boolean(process.env.CLAUDE_PEON_DEBUG)
const DEBUG_LOG = resolve(homedir(), ".claude", "claude-peon-debug.log")
const WHISPER_VOLUME = 1

function log(message, extra) {
  if (!DEBUG) {
    return
  }
  try {
    const line = `${new Date().toISOString()} ${message}${extra ? ` ${JSON.stringify(extra)}` : ""}\n`
    appendFileSync(DEBUG_LOG, line)
  } catch {
    // swallow errors silently — never write to stdout
  }
}

function loadConfig(configPath) {
  const DEFAULT_CONFIG = { volume: 5, mappings: [] }

  if (!existsSync(configPath)) {
    log("config-missing", { path: configPath })
    return DEFAULT_CONFIG
  }

  try {
    const contents = readFileSync(configPath, "utf8")
    const parsed = JSON.parse(contents)
    if (!parsed || !Array.isArray(parsed.mappings)) {
      log("config-invalid", { reason: "missing-mappings" })
      return DEFAULT_CONFIG
    }
    return parsed
  } catch (error) {
    log("config-error", { message: error?.message ?? "unknown" })
    return DEFAULT_CONFIG
  }
}

function getRandomSound(sounds) {
  if (!Array.isArray(sounds) || sounds.length === 0) {
    return null
  }
  const index = Math.floor(Math.random() * sounds.length)
  return sounds[index]
}

function playSound(soundFile, volume, whisper) {
  const effectiveVolume = whisper ? WHISPER_VOLUME : volume
  const afplayVolume = Math.pow(effectiveVolume / 10, 2)
  const soundPath = resolve(SOUNDS_DIR, soundFile)

  if (!existsSync(soundPath)) {
    log("sound-missing", { path: soundPath })
    return
  }

  try {
    const child = spawn("/usr/bin/afplay", ["-v", String(afplayVolume), soundPath], {
      stdio: "ignore",
      detached: true,
    })

    child.on("error", () => {
      // suppress errors — do NOT write to stdout
    })

    child.unref()
    log("sound-play", { soundFile, effectiveVolume, afplayVolume })
  } catch (error) {
    log("spawn-failed", { message: error?.message ?? "unknown" })
  }
}

async function main() {
  // Silent exit on non-macOS
  if (process.platform !== "darwin") {
    process.exit(0)
  }

  // Silent exit if afplay is missing
  if (!existsSync("/usr/bin/afplay")) {
    process.exit(0)
  }

  // Read stdin fully
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim()

  // Parse JSON — malformed input exits silently
  let event
  try {
    event = JSON.parse(raw)
  } catch {
    process.exit(0)
  }

  // Extract hook_event_name — missing exits silently
  const hookEventName = event?.hook_event_name
  if (!hookEventName) {
    process.exit(0)
  }

  log("event-received", { hookEventName, toolName: event?.tool_name, notificationType: event?.notification_type })

  const config = loadConfig(CONFIG_PATH)
  const volume = typeof config.volume === "number" ? config.volume : 5
  const mappings = Array.isArray(config.mappings) ? config.mappings : []

  // Dispatch loop — find first matching mapping and play its sound
  for (const mapping of mappings) {
    if (!mapping?.triggers || !mapping?.sounds) {
      continue
    }

    const matched = mapping.triggers.some((trigger) => {
      if (!trigger?.type) return false

      if (trigger.type === "event") {
        if (trigger.event !== hookEventName) return false
        // Optional matcher: for Notification events, filter by notification_type
        if (trigger.matcher) {
          return trigger.matcher === event?.notification_type
        }
        return true
      }

      if (trigger.type === "tool.before") {
        if (hookEventName !== "PreToolUse") return false
        // Optional tool filter: case-insensitive comparison
        if (trigger.tool) {
          return trigger.tool.toLowerCase() === (event?.tool_name ?? "").toLowerCase()
        }
        return true
      }

      if (trigger.type === "tool.after") {
        if (hookEventName !== "PostToolUse") return false
        // Optional tool filter: case-insensitive comparison
        if (trigger.tool) {
          return trigger.tool.toLowerCase() === (event?.tool_name ?? "").toLowerCase()
        }
        return true
      }

      return false
    })

    if (matched) {
      const soundFile = getRandomSound(mapping.sounds)
      if (soundFile) {
        playSound(soundFile, volume, Boolean(mapping.whisper))
      }
      log("mapping-matched", { name: mapping.name, hookEventName })
    }
  }

  process.exit(0)
}

main()
