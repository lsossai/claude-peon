# claude-peon

Plays Blizzard RTS sounds during your Claude Code sessions.

Hear "Work complete!" when the agent finishes, peon acknowledgements when you send a message, and building sounds as tools run in the background.

## Sound Libraries

Includes sounds from multiple Blizzard RTS games:

- **Warcraft II** - Horde and Alliance units, buildings, and UI sounds
- **Warcraft III** - Peasant voice lines
- **StarCraft: Brood War** - Terran, Protoss, and Zerg units
- **StarCraft 2** - Terran, Protoss, and Zerg units

## Presets

### Bundled Presets

Eight presets are included with the project and cannot be deleted:

| Preset | Theme |
|--------|-------|
| `bundled-sc2-protoss` | StarCraft 2 Protoss |
| `bundled-sc2-terran` | StarCraft 2 Terran |
| `bundled-sc2-zerg` | StarCraft 2 Zerg |
| `bundled-scbw-misc` | StarCraft: Brood War misc sounds |
| `bundled-scbw-protoss` | StarCraft: Brood War Protoss |
| `bundled-scbw-terran` | StarCraft: Brood War Terran |
| `bundled-scbw-zerg` | StarCraft: Brood War Zerg |
| `bundled-wc2-alliance` | Warcraft II Alliance |

### User Presets

Four user presets are included and can be edited or deleted:

| Preset | Theme |
|--------|-------|
| `wc2-peon` | Warcraft II Peon |
| `wc2-ogre-mage` | Warcraft II Ogre Mage |
| `wc3-peasant` | Warcraft III Peasant |
| `scbw-scv` | StarCraft: Brood War SCV |

Set `"randomPreset": true` in `claude-peon.json` to load a random preset each session.

## Setup

**Requirements:** macOS, [Bun](https://bun.sh)

1. Clone this repo
2. Run the config UI: `bun run ui`
3. Open http://localhost:3456
4. Pick a preset or configure mappings manually
5. Click **Apply**
6. Restart Claude Code

The UI writes hook entries into `~/.claude/settings.json`, pointing each hook event at `play.js`.

## Config UI

A web-based UI for managing your sound configuration:

```bash
bun run ui
```

Open http://localhost:3456 to:

- Adjust volume (1-10)
- Toggle random preset on startup
- Add, edit, and delete mappings with trigger and sound configuration
- Browse and preview all available sounds
- Save, load, and delete presets (bundled presets are read-only)
- View active hooks installed in Claude Code settings
- Delete individual hooks (peon or external)
- Apply or remove all peon hooks from Claude Code settings

## Configuration

The `claude-peon.json` file maps Claude Code hook events to sounds:

```json
{
  "volume": 5,
  "randomPreset": false,
  "mappings": [
    {
      "name": "work-complete",
      "whisper": false,
      "triggers": [
        { "type": "event", "event": "Stop" }
      ],
      "sounds": ["wc2-horde/peon-work-complete-1.wav"]
    }
  ]
}
```

### Volume

`volume` (1-10) controls playback loudness. Uses an exponential curve for perceptually linear volume. Default is 5.

### Whisper

Per-mapping `whisper` flag. When `true`, the mapping always plays at volume 1 regardless of the global volume setting. Useful for subtle background sounds on frequent triggers.

### Trigger Types

Each mapping has a `triggers` array. Three trigger types are supported:

#### `event` — Match a hook event

Fires when the specified hook event occurs.

```json
{ "type": "event", "event": "Stop" }
```

Supports an optional `matcher` field for sub-filtering. For `Notification` events, `matcher` filters by `notification_type`:

```json
{ "type": "event", "event": "Notification", "matcher": "permission_prompt" }
```

#### `tool.before` — Fire before a tool executes

Maps to the `PreToolUse` hook. Without a `tool` field, fires before any tool. With a `tool` field, fires only before that specific tool (case-insensitive):

```json
{ "type": "tool.before", "tool": "bash" }
```

#### `tool.after` — Fire after a tool completes

Maps to the `PostToolUse` hook. Without a `tool` field, fires after any tool. With a `tool` field, fires only after that specific tool (case-insensitive):

```json
{ "type": "tool.after", "tool": "bash" }
```

Available tool values: `question`, `bash`, `read`, `write`, `edit`, `glob`, `grep`, `task`, `webfetch`, `todowrite`, `todoread`, `skill`.

## Hook Events

| Event | Description |
|-------|-------------|
| `Stop` | Agent finished working (turn complete) |
| `PreToolUse` | Fires before any tool executes |
| `PostToolUse` | Fires after any tool executes |
| `Notification` | Claude Code sends a notification (permission prompts, etc.) |
| `SessionStart` | Session started |
| `UserPromptSubmit` | User submits a message |

## Debug Mode

Set `CLAUDE_PEON_DEBUG=1` before starting Claude Code, or export it in your shell profile:

```bash
CLAUDE_PEON_DEBUG=1 claude
```

Logs are written to `~/.claude/claude-peon-debug.log`.

## Notes

- Audio playback uses `afplay` (macOS only); auto-disables on other platforms or if `afplay` is missing
- Sounds can overlap (no single-flight guard)

## Credits

Sound files are from Warcraft II, Warcraft III, StarCraft: Brood War, and StarCraft 2 by Blizzard Entertainment.
