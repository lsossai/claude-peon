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

Four presets are included out of the box:

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
3. Open http://localhost:3456 — pick your sounds and configure mappings
4. Click **Apply** (choose Global or Project scope)
5. Restart Claude Code

## Config UI

A web-based UI for managing your sound configuration:

```bash
bun run ui
```

Open http://localhost:3456 to:

- Adjust volume (1-10)
- Toggle random preset on startup
- Add, remove, and edit mappings (triggers and sounds)
- Browse and preview all available sounds
- Save and load presets
- Apply or remove hooks from Claude Code settings

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
- Preset switching via the UI takes effect after reloading config

## Credits

Sound files are from Warcraft II, Warcraft III, StarCraft: Brood War, and StarCraft 2 by Blizzard Entertainment.
