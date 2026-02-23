# Feature Research

**Domain:** Sound notification plugin for AI coding CLI tools (Claude Code hooks)
**Researched:** 2026-02-23
**Confidence:** HIGH — Claude Code hooks documentation is authoritative; competitor analysis drawn from live repos and articles

---

## Context

The conversion target (claude-peon) is a clone-and-run sound effects plugin. Users clone the repo, open a web config UI, pick sounds, click "Apply", and get Warcraft/StarCraft audio cues in their Claude Code sessions. The audience is developers who want ambient audio feedback while coding — not sysadmins, not power users scripting custom integrations.

The Claude Code hooks system (confirmed from official docs at code.claude.com/docs/en/hooks) provides 17 lifecycle events. For a sound plugin, the relevant events are:

| Hook Event | When It Fires | Sound Use Case |
|------------|---------------|----------------|
| `SessionStart` | Session begins/resumes | Startup chime |
| `UserPromptSubmit` | User submits a prompt | Acknowledge sound |
| `PreToolUse` | Before any tool call | Pre-action sound (optional) |
| `PostToolUse` | After tool succeeds | Post-action sound |
| `PostToolUseFailure` | After tool fails | Error sound |
| `Notification` | Claude sends a notification (idle, permission, etc.) | Alert sound |
| `Stop` | Claude finishes responding | Work-complete sound |
| `SubagentStop` | Subagent finishes | Completion sound |
| `SessionEnd` | Session terminates | Goodbye sound |

The `Notification` event matches on `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog` — enabling separate sounds for "Claude needs permission" vs "Claude is done and idle."

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sound on task completion | Core value proposition — know when Claude is done without watching the screen | LOW | Maps to `Stop` hook. Single afplay call. Already implemented in original. |
| Sound on permission/idle notification | Users multitask; need to know Claude is waiting | LOW | Maps to `Notification` hook with `permission_prompt` and `idle_prompt` matchers. Closest Claude Code equivalent to opencode's `permission.asked`. |
| Sound on session start | Confirms the plugin is active and working | LOW | Maps to `SessionStart`. Already implemented as `openpeon.startup`. |
| Sound on user prompt submit (acknowledge) | Tactile feedback loop — "my message was received" | LOW | Maps to `UserPromptSubmit`. Already implemented via `message.updated` in original. |
| Volume control | Sounds at wrong volume = users immediately disable the whole plugin | LOW | 1–10 scale with exponential curve already exists. Needs to persist via config file. |
| Web UI for configuration | Without a UI, users edit JSON manually; this creates friction and errors | MEDIUM | Already exists at ui/server.js on port 3456. |
| "Apply" button writes hooks into Claude Code settings | Without this, users must manually edit ~/.claude/settings.json — kills the clone-and-run promise | MEDIUM | This is the core conversion work. UI's deploy button must write hook entries into `~/.claude/settings.json` or `.claude/settings.json`. |
| Multiple sound packs (presets) | Users have taste preferences; one sound pack = novelty wears off | LOW | Already exists: wc2, wc3, sc:bw, sc2 presets. |
| Clear macOS-only documentation | Plugin uses afplay; users on Linux/Windows need to know immediately | LOW | Document prominently in README; fail gracefully at runtime. |
| Graceful disable when afplay missing | If plugin crashes or hangs Claude Code, users uninstall immediately | LOW | Already implemented with `audioDisabled` flag. Confirm it survives the hooks migration. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Game sound packs (Warcraft, StarCraft) | Distinct personality vs generic "beep" tools. Nostalgia drives sharing and word-of-mouth. | LOW | Already exists. Needs no new work — just preservation. |
| Random preset on startup | Fresh sound experience per session; reduces habituation | LOW | Already implemented via `config.randomPreset`. Must survive conversion. |
| In-browser sound preview in config UI | Users can audition sounds before applying — reduces "wrong sound" friction | LOW | Already implemented via `/api/sounds/play/` endpoint. |
| Per-mapping whisper mode | Allow softer sounds for less significant events without manual volume tuning | LOW | Already in codebase (`mapping.whisper` flag). Surfacing it in UI is the work. |
| Separate sounds per hook event | Different audio for "Claude done" vs "Claude needs permission" vs "tool failed" | LOW | Claude Code's `Notification` matcher supports `permission_prompt` vs `idle_prompt`; `PostToolUseFailure` enables error sounds. All low complexity. |
| Project-scoped vs global hooks | Power users want sounds only in certain repos | MEDIUM | Claude Code supports `.claude/settings.json` (project) vs `~/.claude/settings.json` (global). The Apply button could ask where to write. |
| Sound on tool failure | Distinct error audio is immediately useful for CI-style long tasks | LOW | Maps to `PostToolUseFailure` hook. One extra mapping in the config. |

### Anti-Features (Commonly Requested, Often Problematic)

Features to explicitly NOT build.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| npm/brew package publishing | "Just install it globally" convenience | Sound files must be local; a global package doesn't solve the sounds-path problem cleanly. Adds publishing overhead and versioning ceremony for v1. | Clone-and-run is sufficient. README documents it clearly. |
| Linux/Windows audio support | Users on those platforms want sounds too | afplay is macOS-only. Cross-platform audio (mpg123, PowerShell MediaPlayer) adds branching complexity; each platform requires testing. The original never supported it. Document macOS-only clearly instead. | Document the limitation. Return gracefully on non-macOS at runtime. |
| MCP server integration | Some users want to switch presets from within Claude | Adds a second entry point, second configuration surface, and second set of dependencies. Hooks-only is simpler and sufficient for the sound use case. The original's `peon_switch_preset` tool is unnecessary without MCP. | The web UI handles all config. No need for in-session switching. |
| CLI configuration commands | "claude-peon volume 7" style commands | Adds a CLI layer on top of the web UI. Two ways to configure = two places bugs can live. The web UI is already the right interface. | Web UI is the single config surface. |
| Real-time sound preview during Claude sessions | Play a preview sound from within the Claude Code session | Requires MCP tools or in-process execution. Hooks are fire-and-forget shell commands, not interactive. | Web UI already provides in-browser preview via /api/sounds/play/. |
| Desktop notifications (OS popups) | Users see other tools do both sounds + notifications | Different product. OS notification integrations (osascript, notify-send) are platform-specific and have their own permission systems. Scope creep relative to the "sound effects" core value. | Sounds are the product. Notifications are out of scope. |
| Homebrew formula | Reduces install steps | Adds external dependency on Homebrew; tap maintenance burden; and still doesn't solve sound file distribution elegantly. Clone-and-run is simpler for a personal tool with local file assets. | Clone + `bun run ui` is two commands. Document clearly. |

---

## Feature Dependencies

```
[Web UI Apply Button]
    └──requires──> [Claude Code settings.json writer]
                       └──requires──> [Hook entry format known]
                                          (see hooks docs: code.claude.com/docs/en/hooks)

[Sound on task completion]
    └──requires──> [Stop hook registered in settings.json]
                       └──requires──> [play.js or shell script invocable from hook command]

[Sound on permission/idle]
    └──requires──> [Notification hook registered with matcher: "permission_prompt|idle_prompt"]

[Sound on tool failure]
    └──requires──> [PostToolUseFailure hook registered]

[Random preset on startup]
    └──requires──> [Preset files present in ui/presets/]
    └──enhances──> [Sound on session start]

[Per-mapping whisper mode]
    └──enhances──> [Volume control]
    └──requires──> [Config schema includes whisper flag per mapping]

[Project-scoped vs global hooks]
    └──enhances──> [Web UI Apply Button]
    └──requires──> [Apply button UI asks scope before writing]
```

### Dependency Notes

- **Apply button requires hooks format**: The `settings.json` hooks schema must be understood before the UI can write valid entries. Confirmed from official docs: hooks live under a `hooks` key with event names as sub-keys, each containing an array of matcher+hooks objects.
- **Hook command requires invocable script**: Claude Code hooks call shell commands. The current `index.js` is a plugin export, not a CLI script. The conversion must produce a standalone `play.sh` or `play.js` that Claude Code can invoke with `node /path/play.js --event Stop`.
- **Sound on failure is independent**: `PostToolUseFailure` is a separate hook from `PostToolUse`. Each needs its own entry in the config; they don't share a handler.
- **Preset system is independent of hooks**: Preset loading/switching is a UI concern only. Hooks just call the play script; the script reads the current config to know which sounds to play.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept and fulfill the "anyone should be able to clone and use this in minutes" promise.

- [x] Sound on task completion (`Stop` hook) — core value proposition
- [x] Sound on session start (`SessionStart` hook) — confirms plugin is active
- [x] Sound on user prompt submit (`UserPromptSubmit` hook) — acknowledge feedback loop
- [x] Sound on permission/idle notification (`Notification` hook) — "Claude needs you" alert
- [x] Volume control persisted in config file — essential for comfort
- [x] Web UI "Apply" button writes hooks into `~/.claude/settings.json` — clone-and-run promise
- [x] Multiple presets (wc2, wc3, sc:bw, sc2) — personality, already exist
- [x] Random preset on startup — no code change, preserve existing behavior
- [x] Clear README: clone → run UI → pick sounds → click Apply → done
- [x] macOS-only clearly documented; graceful no-op on other platforms

### Add After Validation (v1.x)

Features to add once core is working and the conversion is stable.

- [ ] Sound on tool failure (`PostToolUseFailure` hook) — useful for long-running tasks; add when base hooks are stable
- [ ] Project-scoped hooks option in Apply button — useful for teams sharing a repo; add when global scope is working
- [ ] Whisper mode surfaced in UI per mapping — already in codebase; expose in UI when base conversion is done

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Additional sound packs — only if users ask; not a blocker
- [ ] SubagentStop hook support — subagents are a power-user feature; wait to see if users ask
- [ ] Sound on session end (`SessionEnd` hook) — cosmetic; low impact

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Apply button writes hooks into settings.json | HIGH | MEDIUM | P1 |
| Sound on `Stop` (task complete) | HIGH | LOW | P1 |
| Sound on `Notification` (permission/idle) | HIGH | LOW | P1 |
| Sound on `SessionStart` | MEDIUM | LOW | P1 |
| Sound on `UserPromptSubmit` | MEDIUM | LOW | P1 |
| Volume control | HIGH | LOW | P1 |
| Multiple presets | HIGH | LOW (already exists) | P1 |
| Clear README / install docs | HIGH | LOW | P1 |
| Sound on `PostToolUseFailure` | MEDIUM | LOW | P2 |
| Project-scoped hooks | MEDIUM | MEDIUM | P2 |
| Whisper mode in UI | LOW | LOW | P2 |
| SubagentStop hook | LOW | LOW | P3 |
| SessionEnd hook | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch — the conversion is not done without these
- P2: Should have, add when P1 is stable
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | opencode-notifier (mohak34) | claude-code-notification (wyattjoh) | hook-sound-notifications (Dev-GOM) | claude-sounds (daveschumaker) | Our Approach |
|---------|----------------------------|------------------------------------|------------------------------------|-------------------------------|--------------|
| Events covered | permission, complete, error, question | Notification hook only | 9 hook types | Notification hook only | Stop, Notification, SessionStart, UserPromptSubmit (v1); PostToolUseFailure (v1.x) |
| Game sound packs | No | No | No | No (random generic sounds) | Yes — WC2, WC3, SC:BW, SC2 |
| Web UI for config | No | No | No | No | Yes |
| Install method | Plugin system | Homebrew | Marketplace | Homebrew | Clone + `bun run ui` |
| "Apply" auto-writes config | N/A (plugin) | No | No | No | Yes — this is the differentiator |
| Volume control | Per-event | Via --sound param | Global + per-hook | No | 1–10 scale, exponential curve |
| In-browser sound preview | No | No | No | No | Yes |
| Random preset | No | No | No | Yes (random sound) | Yes (random preset per session) |
| Platform | macOS, Linux, Windows | macOS (notifications + sounds) | macOS, Linux, Windows | macOS | macOS (explicit, documented) |

**Key insight**: No existing Claude Code sound plugin has a web configuration UI or game-themed sound packs. The field is populated by one-file shell scripts or minimal CLI tools. Claude-peon's combination of web UI + game sounds + one-click Apply is genuinely differentiated.

---

## Sources

- Claude Code hooks reference: [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks) — HIGH confidence, official docs
- Sound notification feature request: [github.com/anthropics/claude-code/issues/1288](https://github.com/anthropics/claude-code/issues/1288) — HIGH confidence, closed/completed
- Sound notification feature request: [github.com/anthropics/claude-code/issues/10689](https://github.com/anthropics/claude-code/issues/10689) — HIGH confidence, official repo
- opencode-notifier plugin: [github.com/mohak34/opencode-notifier](https://github.com/mohak34/opencode-notifier) — MEDIUM confidence, live repo
- claude-code-notification: [github.com/wyattjoh/claude-code-notification](https://github.com/wyattjoh/claude-code-notification) — MEDIUM confidence, live repo
- hook-sound-notifications: [github.com/Dev-GOM/claude-code-marketplace](https://github.com/Dev-GOM/claude-code-marketplace/blob/main/plugins/hook-sound-notifications/README.md) — MEDIUM confidence, live repo
- claude-sounds: [github.com/daveschumaker/homebrew-claude-sounds](https://github.com/daveschumaker/homebrew-claude-sounds) — MEDIUM confidence, live repo
- Age of Empires hooks writeup: [alexop.dev](https://alexop.dev/posts/how-i-added-sound-effects-to-claude-code-with-hooks/) — LOW confidence (single author blog, no external verification)

---

*Feature research for: sound notification plugin for Claude Code (hooks system)*
*Researched: 2026-02-23*
