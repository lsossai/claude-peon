# claude-peon

A Claude Code hooks tool that plays Warcraft II sounds in response to hook events during your coding session. Hook scripts read stdin JSON from Claude Code, match events to sound mappings, and spawn afplay.

## Project Structure

```
claude-peon/
  play.js               # Hook dispatcher — reads Claude Code stdin, plays sounds
  claude-peon.json      # Config file mapping hook events to sounds
  package.json          # NPM package metadata
  sounds/               # Sound assets
    *.wav               # Root-level sounds
    wc2-horde/          # Full Warcraft II Horde sound library
    wc2-alliance/       # Full Warcraft II Alliance sound library
    wc3-peasant/        # Warcraft III Peasant sounds
    sc2/                # StarCraft 2 sounds
    scbw/               # StarCraft: Brood War sounds
  ui/                   # Config management UI
    server.js           # Bun server for the UI
    index.html          # Web interface
    presets/            # Saved preset configurations
  CLAUDE.md             # This file
  README.md             # User-facing documentation
```

## How It Works

`play.js` is registered as a Claude Code hook command. On each hook event:

1. Claude Code passes a JSON payload to stdin describing the event
2. `play.js` reads all of stdin and parses `hook_event_name` from the JSON
3. It loads `claude-peon.json` and finds mappings whose triggers match the event
4. For each matching mapping, it picks a random sound and spawns `afplay` detached
5. The script always exits 0 and never writes to stdout (Claude Code ignores non-zero exits from async hooks, but keeping it clean avoids noise)

## Config Format

The `claude-peon.json` file defines mappings between hook events and sounds:

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
      "sounds": ["wc2-horde/peon-work-complete-1.wav", "wc2-horde/peon-work-complete-2.wav"]
    }
  ]
}
```

### Volume

- `volume` (number, 1-10) - Default playback volume. Defaults to 5 if omitted.
- Converted to afplay volume using an exponential curve for perceptually linear loudness.

### Random Preset

- `randomPreset` (boolean) - When `true`, a random preset is loaded at startup. Defaults to `false`.

### Whisper

- Per-mapping `whisper` (boolean) - When `true`, the mapping plays at volume 1 regardless of the global setting. Useful for frequent triggers like tool events.

## Hook Events

| Event | Description |
|-------|-------------|
| `Stop` | Agent finished working (turn complete) |
| `PreToolUse` | Fires before any tool executes |
| `PostToolUse` | Fires after any tool executes |
| `Notification` | Claude Code sends a notification (permission prompts, etc.) |
| `SessionStart` | Session started |
| `UserPromptSubmit` | User submits a message |

## Setup

1. Run the config UI: `bun run ui`
2. Open http://localhost:3456 — configure mappings and sounds
3. Click **Apply** (choose Global or Project scope)
4. Restart Claude Code

The UI writes hook entries into `~/.claude/settings.json` (global) or `.claude/settings.json` (project), pointing each event at `play.js`.

## Debug Mode

Set `CLAUDE_PEON_DEBUG=1` before launching Claude Code:

```bash
CLAUDE_PEON_DEBUG=1 claude
```

Logs are written to `~/.claude/claude-peon-debug.log`.

## Notes

- Audio playback uses `afplay` (macOS only); auto-disables if `afplay` is missing
- Sounds can overlap (no single-flight guard)
- `play.js` is a single-run script, not a long-running daemon
