# Phase 2: Config Schema Migration - Research

**Researched:** 2026-02-23
**Domain:** JSON config file migration — OpenCode event name vocabulary → Claude Code hook event names
**Confidence:** HIGH

## Summary

Phase 2 is a pure data migration. The codebase already has two config systems in parallel: `claude-peon.json` (the new dispatcher's config, created in Phase 1 with correct Claude Code hook event names) and the legacy configs: `openpeon.json` at the root plus four preset files in `ui/presets/` that still use OpenCode event names (`openpeon.startup`, `message.updated`, `session.idle`, `permission.asked`, `session.created`). The UI server (`ui/server.js`) also hardcodes these old OpenCode event names in its `EVENT_VALUES` constant, which drives the event dropdown in the config editor.

The work is entirely mechanical. Every old event name maps directly and unambiguously to a Claude Code hook event name. The `tool.before` and `tool.after` trigger types are already correctly named (they pass through the dispatcher as `PreToolUse`/`PostToolUse` matches). The `volume` field and its exponential curve live entirely in `play.js` — no config schema change is needed for volume. The `CONF-01` rename (openpeon.json → claude-peon.json) is the only rename; `claude-peon.json` already exists from Phase 1 so this is simply a deletion of the now-redundant `openpeon.json`.

The critical risk is the `scbw-scv.json` preset's `session.created` event: there is no direct Claude Code hook equivalent for "new session created" that differs from `SessionStart`. The mapping must be collapsed to `SessionStart`. There is also a structural issue: presets use `tool.before:question` triggers. In Phase 1, the dispatcher's `tool.before` branch matches all `PreToolUse` events regardless of tool name — the `tool` field in the trigger is ignored. This means `tool.before:question` in a preset will fire on ANY tool use, not just the question tool. This is a known Phase 1 simplification, not something Phase 2 should fix (per-tool filtering is deferred). The migration should preserve the existing trigger structure faithfully; the behavior difference is pre-existing and documented.

**Primary recommendation:** Update `ui/server.js` EVENT_VALUES to the six Claude Code hook names, migrate all four preset files to use Claude Code hook event names, delete `openpeon.json`, and verify volume persists correctly by inspecting `play.js` (no changes needed there).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-01 | Config file renamed from `openpeon.json` to `claude-peon.json` | `claude-peon.json` already exists with correct content from Phase 1. `openpeon.json` is the legacy file to delete. Rename = delete the old file. |
| CONF-02 | Trigger types in default config migrated to Claude Code hook event names | `claude-peon.json` already contains correct Claude Code names (Stop, SessionStart, UserPromptSubmit, Notification, PreToolUse via tool.before, PostToolUse via tool.after). Verify and update UI server EVENT_VALUES. |
| CONF-03 | All preset files migrated to Claude Code hook event names | All 4 presets use openpeon event names. Full migration map documented below. |
| CONF-04 | Volume control preserved with exponential curve (1-10 scale) | Volume is read from config `volume` field by `play.js` and processed with `Math.pow(effectiveVolume / 10, 2)`. No config schema change required. Verify the field is preserved in all migrated files. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | ESM (project default) | `fs.readFileSync`, `fs.writeFileSync`, `JSON.parse`, `JSON.stringify` | No new dependencies needed; all operations are in-place JSON file edits |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | — | This is a file-editing task, not a code-writing task |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-editing JSON files | A migration script | For 4 preset files and 1 config, a script would be overengineering; direct edits are faster and verifiable |

**Installation:**
```bash
# No new dependencies needed
```

---

## Architecture Patterns

### File Inventory: What Changes in Phase 2

```
claude-peon/
├── claude-peon.json          # DEFAULT CONFIG: already correct (Phase 1 output). Verify only.
├── openpeon.json             # LEGACY: Delete this file (CONF-01)
├── play.js                   # No changes — volume curve and dispatcher are correct
├── ui/
│   ├── server.js             # Update EVENT_VALUES constant (lines 20-58) to Claude Code names
│   └── presets/
│       ├── wc2-peon.json     # Migrate all event triggers (see map below)
│       ├── wc2-ogre-mage.json # Migrate all event triggers
│       ├── wc3-peasant.json  # Migrate all event triggers
│       └── scbw-scv.json    # Migrate all event triggers + handle session.created edge case
```

### Pattern 1: Event Name Migration Map

**What:** Exact, deterministic mapping from old OpenCode event names to Claude Code hook event names.

**The complete migration table:**

| Old Name (OpenCode) | New Name (Claude Code) | Rationale |
|---------------------|------------------------|-----------|
| `openpeon.startup` | `SessionStart` | Both fire at session/app startup. `SessionStart` is the correct Claude Code hook. |
| `message.updated` (role: user) | `UserPromptSubmit` | `UserPromptSubmit` fires when the user submits a prompt — the semantic equivalent. |
| `session.idle` | `Stop` | `session.idle` fired when the agent finished. `Stop` is the Claude Code hook that fires when the agent's turn ends. |
| `permission.asked` | `Notification` | `permission.asked` fired on permission prompts. `Notification` with `notification_type: permission_prompt` is the equivalent. Phase 1 fires for all Notification types (no sub-filtering). |
| `session.created` | `SessionStart` | Used only in `scbw-scv.json`. No direct Claude Code equivalent; collapse to `SessionStart`. |

**What does NOT change:**
- `tool.before` trigger type: keep as-is. The dispatcher matches these to `PreToolUse` events.
- `tool.after` trigger type: keep as-is. The dispatcher matches these to `PostToolUse` events.
- The `tool` field inside `tool.before`/`tool.after` triggers: keep as-is. The dispatcher ignores this field in Phase 1 (per-tool filtering deferred).
- The `role: "user"` filter on `message.updated` triggers: this field can be dropped since `UserPromptSubmit` already scopes to user messages only. No harm leaving it but it is semantically redundant and should be removed for cleanliness.

### Pattern 2: preset file schema (post-migration shape)

**What:** The migrated preset file format.

**Example — wc2-peon.json welcome mapping (before and after):**

Before:
```json
{
  "name": "welcome",
  "triggers": [
    { "type": "event", "event": "openpeon.startup" }
  ],
  "sounds": ["wc2-horde/peon-other-ready.wav"]
}
```

After:
```json
{
  "name": "welcome",
  "triggers": [
    { "type": "event", "event": "SessionStart" }
  ],
  "sounds": ["wc2-horde/peon-other-ready.wav"]
}
```

**Example — acknowledge mapping (before and after):**

Before:
```json
{
  "name": "acknowledge",
  "triggers": [
    { "type": "event", "event": "message.updated", "role": "user" }
  ],
  "sounds": ["..."]
}
```

After:
```json
{
  "name": "acknowledge",
  "triggers": [
    { "type": "event", "event": "UserPromptSubmit" }
  ],
  "sounds": ["..."]
}
```

**Example — scbw-scv.json new-session mapping (edge case — collapse session.created):**

Before:
```json
{
  "name": "new-session",
  "triggers": [
    { "type": "event", "event": "session.created" }
  ],
  "sounds": ["scbw-terran/advisor-upd04.wav"]
}
```

After (merged into welcome mapping, or kept as a second SessionStart mapping):
```json
{
  "name": "new-session",
  "triggers": [
    { "type": "event", "event": "SessionStart" }
  ],
  "sounds": ["scbw-terran/advisor-upd04.wav"]
}
```

Note: Two mappings in the same preset with `SessionStart` as a trigger will BOTH fire at session start (the dispatcher iterates all mappings, not first-match-only). This is acceptable behavior — both sounds would play. However, for a cleaner result, the two `SessionStart` mappings in `scbw-scv.json` (welcome + new-session) should be merged into a single mapping with the combined sounds array.

### Pattern 3: server.js EVENT_VALUES update

**What:** The `EVENT_VALUES` array in `ui/server.js` (lines 20–58) lists all valid event names for the config editor UI. After migration, only Claude Code hook event names should appear.

**Current EVENT_VALUES (partial, OpenCode names mixed in):**
```javascript
const EVENT_VALUES = [
  "command.executed",
  "file.edited",
  // ... many OpenCode-specific events ...
  "session.idle",
  "permission.asked",
  "openpeon.startup",
]
```

**Replacement EVENT_VALUES (Claude Code hook names only):**
```javascript
const EVENT_VALUES = [
  "Stop",
  "PreToolUse",
  "PostToolUse",
  "Notification",
  "SessionStart",
  "UserPromptSubmit",
]
```

This is a complete replacement of the array content. The old OpenCode event names are no longer valid; including them would cause confusion in the UI.

### Anti-Patterns to Avoid

- **Leaving `openpeon.json` in place:** It will never be read by `play.js` (which reads `claude-peon.json`) but will confuse anyone looking at the repo. Delete it.
- **Keeping `role: "user"` filter on UserPromptSubmit triggers:** `UserPromptSubmit` only fires for user messages by definition; the `role` field is dead weight and should be dropped.
- **Merging presets together instead of migrating in place:** Each preset file is independent and should remain independent. Only the trigger event names change, not the structure or sound assignments.
- **Forgetting `volume` in migrated preset files:** All existing presets have `"volume": 3`. This field must be preserved intact in each file. Do not add or remove it.
- **Changing `randomPreset` in preset files:** Some presets have `"randomPreset": true`. This is read by `ui/server.js` and the UI layer — not by `play.js`. Leave it unchanged.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration script | A script to transform all preset files programmatically | Direct in-place JSON edits | Only 4 preset files + 1 config; a script would be more lines than the migrations themselves |
| Schema validation | JSON Schema or Zod validation on load | Keep existing `readFileSync + JSON.parse + array check` pattern from `play.js` | QUAL-01 (schema validation) is a v2 requirement; don't add it now |
| Backup system | Git-based recovery | The files are tracked in git; `git diff` is the backup | Not needed |

**Key insight:** This phase is entirely JSON editing. The correct implementation is the simplest one: open each file, change the event name strings, save.

---

## Common Pitfalls

### Pitfall 1: Missing the `tool.before:question` trigger semantic change

**What goes wrong:** The `permission-asked` mapping in all presets has TWO triggers: `{ "type": "event", "event": "permission.asked" }` AND `{ "type": "tool.before", "tool": "question" }`. After migration, `permission.asked` becomes `Notification`. But `tool.before:question` stays as-is. Since Phase 1 dispatch matches ALL `PreToolUse` events to any `tool.before` trigger (ignoring the `tool` field), the `tool.before:question` trigger will now fire on EVERY tool use, not just the question tool.

**Why it happens:** Phase 1 deferred per-tool filtering. The old OpenCode plugin respected the `tool` field; the new `play.js` does not yet.

**How to avoid:** This is a pre-existing limitation from Phase 1, not introduced by Phase 2. Do NOT try to fix it in Phase 2 (per-tool filtering is out of scope). Document it. The planner should note in the plan that `tool.before:question` triggers will fire on all PreToolUse events and this is expected behavior for now.

**Decision for Phase 2:** Remove the `tool.before:question` triggers from the `permission-asked` mapping in all presets, since they no longer serve their intended purpose (question tool detection) and would cause the permission sound to fire on every tool call. The `Notification` trigger is sufficient for the permission-asked use case.

**Warning signs:** Permission sounds playing on every tool use during a session.

### Pitfall 2: scbw-scv.json has `session.created` (no direct Claude Code equivalent)

**What goes wrong:** `session.created` has no Claude Code hook equivalent. If left as-is, the trigger will never match and the `new-session` mapping in scbw-scv.json will never fire.

**Why it happens:** OpenCode had more fine-grained session events than Claude Code hooks.

**How to avoid:** Map `session.created` → `SessionStart`. Decide whether to merge with the existing `welcome` mapping or keep as a separate `SessionStart`-triggered mapping. Keeping them separate means both fire at session start (both sounds play consecutively). Merging them into one mapping with a combined sounds array gives random selection from the full pool. Either is correct; the plan should pick one for consistency.

**Recommendation:** Keep `new-session` as a separate mapping with `SessionStart`. The double-fire at startup is intentional in this preset's design (it has separate welcome and advisor sounds).

**Warning signs:** `session.created` triggers never fire in scbw-scv.json after migration.

### Pitfall 3: server.js CONFIG_PATH still points to openpeon.json

**What goes wrong:** `ui/server.js` line 7 defines `const CONFIG_PATH = resolve(ROOT, "openpeon.json")`. After `openpeon.json` is deleted (CONF-01), the UI server will fail to load config (falling back to empty) and saving via the UI will write to `openpeon.json` (creating it again as a ghost file).

**Why it happens:** CONF-01 (rename) is Phase 2, but the UI server still points to the old path.

**How to avoid:** Update `CONFIG_PATH` in `ui/server.js` from `"openpeon.json"` to `"claude-peon.json"` as part of Phase 2. This is a one-line change but it is critical for UI-save to persist to the correct file.

**Warning signs:** Config saved via UI creates `openpeon.json` at root; `play.js` reads `claude-peon.json` so UI changes don't take effect.

### Pitfall 4: Forgetting to verify volume end-to-end

**What goes wrong:** CONF-04 requires volume to persist and apply on every `play.js` invocation. The volume lives in the `volume` field of `claude-peon.json` (and is overridden by preset volume when a preset is loaded by the UI). Phase 2 doesn't change `play.js`, but the success criterion explicitly requires a smoke test with a `Stop` event and any preset loaded.

**Why it happens:** Verification gaps — "nothing changed here" is not the same as "it still works."

**How to avoid:** Include a verification step: `echo '{"hook_event_name":"Stop"}' | node play.js` after migration, confirm it exits 0 and plays sound. Also verify `claude-peon.json` has `"volume": 3` (or whatever value was set) after any edits.

---

## Code Examples

### Volume curve in play.js (no change needed — reference only)

```javascript
// Source: play.js (existing, Phase 1 output)
// Volume persists from config.volume field, converted with exponential curve
const volume = typeof config.volume === "number" ? config.volume : 5
// ...
const effectiveVolume = whisper ? WHISPER_VOLUME : volume
const afplayVolume = Math.pow(effectiveVolume / 10, 2)
// effectiveVolume 3 → afplayVolume 0.09
// effectiveVolume 5 → afplayVolume 0.25
// effectiveVolume 10 → afplayVolume 1.0
```

### server.js CONFIG_PATH fix (one-line change)

```javascript
// Before (line 7 of ui/server.js):
const CONFIG_PATH = resolve(ROOT, "openpeon.json")

// After:
const CONFIG_PATH = resolve(ROOT, "claude-peon.json")
```

### server.js EVENT_VALUES replacement

```javascript
// Before (lines 20-58 of ui/server.js — full OpenCode event list):
const EVENT_VALUES = [
  "command.executed",
  "file.edited",
  // ... ~30 OpenCode event names ...
  "openpeon.startup",
]

// After (Claude Code hook names only):
const EVENT_VALUES = [
  "Stop",
  "PreToolUse",
  "PostToolUse",
  "Notification",
  "SessionStart",
  "UserPromptSubmit",
]
```

### End-to-end smoke test (CONF-04 verification)

```bash
# From project root — verifies stop sound plays and play.js exits 0
echo '{"hook_event_name":"Stop"}' | node play.js
echo "exit: $?"

# Verify volume field is present in migrated config
node -e "const c=JSON.parse(require('fs').readFileSync('claude-peon.json','utf8')); console.log('volume:', c.volume); if (typeof c.volume !== 'number') process.exit(1)"

# Verify all presets have volume field
for f in ui/presets/*.json; do
  node -e "const c=JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('$f volume:', c.volume); if (typeof c.volume !== 'number') process.exit(1)"
done
```

### Full migration for a preset file (wc2-peon.json as representative example)

```json
{
  "volume": 3,
  "mappings": [
    {
      "name": "welcome",
      "triggers": [
        { "type": "event", "event": "SessionStart" }
      ],
      "sounds": ["wc2-horde/peon-other-ready.wav"]
    },
    {
      "name": "acknowledge",
      "triggers": [
        { "type": "event", "event": "UserPromptSubmit" }
      ],
      "sounds": [
        "wc2-horde/basic-orc-voices-acknowledge-1.wav",
        "wc2-horde/basic-orc-voices-acknowledge-2.wav",
        "wc2-horde/basic-orc-voices-acknowledge-3.wav",
        "wc2-horde/basic-orc-voices-acknowledge-4.wav"
      ]
    },
    {
      "name": "work-complete",
      "triggers": [
        { "type": "event", "event": "Stop" }
      ],
      "sounds": ["wc2-horde/basic-orc-voices-other-work-complete.wav"]
    },
    {
      "name": "permission-asked",
      "triggers": [
        { "type": "event", "event": "Notification" }
      ],
      "sounds": ["wc2-horde/basic-orc-voices-selected-4.wav"]
    },
    {
      "name": "working-hard",
      "triggers": [
        { "type": "tool.before", "tool": "todowrite" },
        { "type": "tool.before", "tool": "todoread" },
        { "type": "tool.before", "tool": "read" },
        { "type": "tool.before", "tool": "write" },
        { "type": "tool.before", "tool": "edit" },
        { "type": "tool.before", "tool": "glob" },
        { "type": "tool.before", "tool": "grep" },
        { "type": "tool.before", "tool": "bash" }
      ],
      "sounds": [
        "wc2-alliance/buildings-blacksmith.wav",
        "wc2-alliance/buildings-foundry.wav",
        "wc2-alliance/buildings-gold-mine.wav"
      ],
      "whisper": true
    }
  ],
  "randomPreset": true
}
```

Note: `tool.before:question` trigger removed from `permission-asked`. `role: "user"` filter removed from `acknowledge`. All event names updated.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|-----------------|-------|
| OpenCode event bus names (`session.idle`, `message.updated`) | Claude Code hook names (`Stop`, `UserPromptSubmit`) | One-time migration; no ongoing compatibility needed |
| `openpeon.json` as root config | `claude-peon.json` as root config | `claude-peon.json` already created in Phase 1 |
| `openpeon.startup` synthetic event | `SessionStart` Claude Code hook | Direct functional equivalent |

**Deprecated/outdated:**
- `openpeon.json`: superseded by `claude-peon.json`; delete on completion
- OpenCode event names in presets: all replaced by Claude Code hook names

---

## Open Questions

1. **Should `tool.before:question` triggers be removed from `permission-asked` mappings?**
   - What we know: The old OpenCode plugin respected the `tool` field and only fired for the `question` tool. Phase 1 `play.js` fires for ALL PreToolUse events regardless of tool name. Keeping `tool.before:question` in `permission-asked` would cause permission sounds on every tool call.
   - What's unclear: Is the intended behavior "permission sound on every tool call" or "permission sound only on permission prompts"?
   - Recommendation: Remove `tool.before:question` from `permission-asked` mappings. The `Notification` trigger is sufficient. Per-tool filtering is deferred to a future phase.

2. **scbw-scv.json: merge `welcome` and `new-session` into one mapping, or keep as two `SessionStart` mappings?**
   - What we know: Both will fire at session start if kept separate (dispatcher iterates all mappings). Merging produces random-selection behavior from a combined sound pool.
   - What's unclear: Which behavior was intended by the preset author?
   - Recommendation: Keep them as two separate `SessionStart` mappings (both fire at startup). This preserves the original preset's intent of playing both a welcome sound AND an advisor sound at startup.

---

## Complete Per-File Change Summary

### `openpeon.json` (CONF-01)
- Action: Delete the file entirely.
- Reason: `claude-peon.json` is the new config; `openpeon.json` is legacy and unreferenced by `play.js`.

### `claude-peon.json` (CONF-02)
- Action: Verify only. Already contains correct Claude Code hook event names from Phase 1.
- Current event triggers: `SessionStart`, `UserPromptSubmit`, `Stop`, `Notification` (via event type), plus `tool.before` and `tool.after` triggers (correct).
- Confirm `volume: 3` is present.

### `ui/server.js` (CONF-02)
- Action: Two changes:
  1. Line 7: Change `CONFIG_PATH` from `"openpeon.json"` to `"claude-peon.json"`.
  2. Lines 20–58: Replace `EVENT_VALUES` array content with the 6 Claude Code hook event names.
- Also: `DEPLOY_DIR` and `DEPLOY_LOADER` on lines 11–12 still reference `opencode` paths — these are out of scope for Phase 2 (BRND-01 covers renaming in Phase 5).

### `ui/presets/wc2-peon.json` (CONF-03)
- Changes:
  - `welcome` trigger: `openpeon.startup` → `SessionStart`
  - `acknowledge` trigger: `message.updated` (+ `role: "user"`) → `UserPromptSubmit`
  - `work-complete` trigger: `session.idle` → `Stop`
  - `permission-asked` triggers: `permission.asked` → `Notification`; remove `tool.before:question`

### `ui/presets/wc2-ogre-mage.json` (CONF-03)
- Same changes as `wc2-peon.json` (identical trigger structure).

### `ui/presets/wc3-peasant.json` (CONF-03)
- Same changes as `wc2-peon.json` (identical trigger structure).

### `ui/presets/scbw-scv.json` (CONF-03)
- Same changes as above PLUS:
  - `new-session` trigger: `session.created` → `SessionStart`
  - This mapping has no `permission.asked` trigger in its `permission-asked` mapping (already only had `tool.before:question`); after removing `tool.before:question`, add `Notification` trigger.

---

## Sources

### Primary (HIGH confidence)
- `/Users/lucassossai/dev/pessoal/claude-peon/play.js` — Phase 1 output; confirms dispatcher reads `hook_event_name` field and matches against `trigger.event` using exact string equality. Volume logic confirmed.
- `/Users/lucassossai/dev/pessoal/claude-peon/claude-peon.json` — Phase 1 output; confirms correct Claude Code hook event names are already in use. Verified by direct file inspection.
- `/Users/lucassossai/dev/pessoal/claude-peon/openpeon.json` and all 4 preset files — Direct file inspection reveals all old OpenCode event names requiring migration.
- `/Users/lucassossai/dev/pessoal/claude-peon/ui/server.js` — Direct file inspection confirms `CONFIG_PATH` points to `openpeon.json` (needs update) and `EVENT_VALUES` contains old OpenCode event names (needs replacement).
- `.planning/phases/01-hook-dispatcher/01-RESEARCH.md` — Confirmed Claude Code hook event names: `Stop`, `PreToolUse`, `PostToolUse`, `Notification`, `SessionStart`, `UserPromptSubmit`.

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — Phase 2 requirement text confirms scope: CONF-01 through CONF-04.
- `.planning/STATE.md` — Confirms Phase 1 complete; `tool.before`/`tool.after` per-tool filtering deferred.

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure JSON editing, no libraries involved
- Architecture: HIGH — all files inspected directly; migration map derived from actual file contents
- Pitfalls: HIGH — derived from direct code inspection (`play.js` dispatch logic, `server.js` CONFIG_PATH, preset trigger structure)

**Research date:** 2026-02-23
**Valid until:** 2026-08-23 (Claude Code hook event names are stable; verify if a major Claude Code update changes hook API)
