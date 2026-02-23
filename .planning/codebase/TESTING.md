# Testing Patterns

**Analysis Date:** 2026-02-23

## Test Framework

**Runner:**
- Not detected
- No test framework configured (no jest.config.js, vitest.config.js, or similar files)

**Assertion Library:**
- Not in use

**Run Commands:**
- No test scripts defined in `package.json`
- Package.json only contains: `"ui": "bun run ui/server.js"`

## Test File Organization

**Location:**
- No test files found in codebase
- Directory search for `*.test.*` and `*.spec.*` files returned zero matches

**Naming:**
- No test naming convention established

**Structure:**
- Not applicable - no tests present

## Current Testing Status

**Manual Testing Only:**
The codebase currently relies on manual testing. Evidence:
- No automated test suite
- No test configuration files
- No test-related dependencies in package.json
- Deploy process is manual via UI button

**Deployment Testing Pattern:**
- Manual verification via OpenCode UI (`ui/server.js` at port 3456)
- Manual plugin deployment via "Deploy Plugin" button in UI
- OpenCode integration tested manually

## Areas That Should Be Tested

**Plugin Core (`index.js`):**

**Unit test candidates:**
1. `getRandomSound(sounds)` - returns null for empty array, returns valid element from non-empty array
   - Location: `index.js` lines 48-55
   - Edge cases: null input, empty array, single element, multiple elements

2. `loadConfig(configPath, logDebug)` - returns DEFAULT_CONFIG on missing file, parse error, or invalid structure
   - Location: `index.js` lines 57-76
   - Edge cases: missing file, invalid JSON, missing mappings property, valid config

3. `listPresets(presetsDir)` - returns empty array if dir missing, filters .json files
   - Location: `index.js` lines 78-91
   - Edge cases: missing dir, empty dir, mixed file types, recursive traversal

4. `loadPreset(presetsDir, presetName)` - returns null on missing preset or parse error
   - Location: `index.js` lines 93-105
   - Edge cases: missing file, invalid JSON, valid preset

5. `matchesEventTrigger(trigger, eventType, messageRole)` - correctly matches event type and role
   - Location: `index.js` lines 207-221
   - Edge cases: null trigger, missing event, role filters

**Integration test candidates:**
1. Event triggering flow - `fireEvent()` correctly matches mappings and plays sounds
   - Location: `index.js` lines 223-237
   - Dependency chain: mappings → trigger matching → sound selection → playback

2. Message deduplication - duplicate message.updated events are skipped
   - Location: `index.js` lines 255-259
   - Testing: track lastMessageId, verify duplicate suppression

3. Preset loading - loadPreset correctly updates mappings and volume
   - Location: `index.js` lines 176-188
   - Dependency: file system, config parsing, state updates

4. Plugin tools - peon_list_presets, peon_switch_preset, peon_current_config, peon_set_volume
   - Location: `index.js` lines 325-405
   - Testing: mocked preset dir, config changes, tool return values

**Server/API (`ui/server.js`):**

**Unit test candidates:**
1. `getMimeType(filePath)` - returns correct MIME types for extensions
   - Location: `ui/server.js` lines 75-87
   - Edge cases: unknown extensions, case variations, no extension

2. `listSoundDirectories()` - returns sorted directory list with "." first
   - Location: `ui/server.js` lines 89-106
   - Edge cases: missing sounds dir, empty dir, sorting behavior

3. `listSoundsInDirectory(dirName)` - returns .wav and .mp3 files, filters others
   - Location: `ui/server.js` lines 108-116
   - Edge cases: invalid dir name, empty dir, mixed file types

4. `listPresets()` - returns sorted preset names without .json extension
   - Location: `ui/server.js` lines 118-125
   - Edge cases: missing presets dir, no .json files, sorting

5. `loadConfig()` - returns default config on missing file or parse error
   - Location: `ui/server.js` lines 127-138
   - Edge cases: missing file, invalid JSON, empty file

6. `saveConfig(config)` - writes valid JSON to CONFIG_PATH
   - Location: `ui/server.js` lines 140-142
   - Testing: file I/O verification, JSON format

7. `deployPlugin()` - copies files to deploy directory, handles errors
   - Location: `ui/server.js` lines 163-191
   - Edge cases: missing source files, permission errors, cleanup of old files

**Integration test candidates:**
1. GET /api/config - returns current config
   - Location: `ui/server.js` lines 205-207
   - Testing: fetch, JSON response parsing

2. POST /api/config - saves config and persists to file
   - Location: `ui/server.js` lines 209-214
   - Testing: request body parsing, file I/O

3. Sound browser flow - list directories, select dir, list files, filter files
   - Location: `ui/server.js` lines 216-236
   - Endpoints: /api/sounds/directories, /api/sounds/list/*, /api/sounds/play/*

4. Preset management flow - list, load, save, delete presets
   - Location: `ui/server.js` lines 238-271
   - Endpoints: /api/presets, /api/presets/*, DELETE /api/presets/*

5. Deploy flow - copy plugin to deployment directory
   - Location: `ui/server.js` lines 273-276
   - Testing: file system state, directory structure

**Client-side UI (`ui/index.html`):**

**Unit test candidates (JavaScript functions):**
1. `updateVolume(value)` - updates config.volume and DOM
   - Location: `ui/index.html` lines 748-752
   - Edge cases: string to number conversion, min/max bounds

2. `updateRandomPreset(checked)` - updates config.randomPreset
   - Location: `ui/index.html` lines 754-756
   - Testing: boolean state tracking

3. `updateTriggerType(mappingIndex, triggerIndex, type)` - updates trigger type and clears incompatible fields
   - Location: `ui/index.html` lines 902-914
   - Edge cases: event vs tool.before type switching, field cleanup

4. `updateTriggerValue(mappingIndex, triggerIndex, value)` - updates event or tool value
   - Location: `ui/index.html` lines 916-927
   - Edge cases: message.updated role field handling

5. `filterSounds()` - filters sound list by input value
   - Location: `ui/index.html` lines 988-990
   - Testing: case-insensitive matching, empty filter

6. `toggleSoundFile(file)` - adds/removes file from selection set
   - Location: `ui/index.html` lines 1005-1012
   - Testing: set operations, render updates

**Integration test candidates:**
1. Full mapping creation flow - add mapping, add trigger, add sounds, save
   - Endpoints: multiple DOM mutations, API calls
   - Testing: state consistency, persistence

2. Preset save/load flow - save current config as preset, load preset, verify state
   - Endpoints: POST /api/presets/*, GET /api/presets/*, state updates

3. Sound browser modal - open, select directory, filter sounds, select multiple, confirm
   - Testing: modal lifecycle, sound selection state, callback execution

4. Config persistence - edit config in UI, save, reload, verify changes
   - Endpoints: POST /api/config, GET /api/config
   - Testing: round-trip data integrity

## Mocking Strategy

**No mocking framework configured or observed.**

**If tests were added, mocking needs:**

**Node.js File System Mocking (for `index.js` and `ui/server.js`):**
- Mock fs module to control file existence, content, and errors
- Mock process.env for OPENPEON_DEBUG flag
- Mock child_process.spawn for audio playback testing
- Mock homedir() for config path resolution

**Example mocking pattern (pseudo-code):**
```javascript
// Mock fs.existsSync
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => JSON.stringify({ volume: 5, mappings: [] })),
  appendFile: jest.fn((path, content, cb) => cb()),
  readdirSync: jest.fn(() => ['preset1.json', 'preset2.json']),
}))

// Mock child_process.spawn
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    on: jest.fn(),
    unref: jest.fn(),
  }))
}))

// Mock import.meta.url for path resolution
jest.mock('url', () => ({
  fileURLToPath: jest.fn(() => '/test/path'),
}))
```

**Browser/DOM Mocking (for `ui/index.html`):**
- Mock fetch() API for HTTP requests
- Mock document methods for DOM manipulation
- Mock Audio() constructor for sound playback

**Example UI test pattern (pseudo-code):**
```javascript
// Mock fetch
global.fetch = jest.fn((url, opts) => {
  if (url === '/api/config') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ volume: 5, mappings: [] })
    })
  }
  return Promise.resolve({ ok: false })
})

// Test function
test('loadConfig updates DOM', async () => {
  document.body.innerHTML = '<input id="volume-slider"><span id="volume-value">'
  await loadConfig()
  expect(document.getElementById('volume-slider').value).toBe('5')
})
```

## Test Coverage Gaps

**Critical gaps:**
1. **No plugin integration tests** - Event handling with real OpenCode client interface untested
2. **No API endpoint tests** - HTTP status codes, response formats, error handling untested
3. **No file I/O tests** - Config persistence, preset loading/saving untested
4. **No UI interaction tests** - Form submissions, modal interactions, state updates untested
5. **No error scenarios** - Network failures, corrupted files, permission errors untested

**Risk:** Changes to core flows (event routing, config loading, sound playback) could silently break without test coverage.

## Recommended Test Structure

**If implementing tests:**

**Layout:**
```
/tests
├── unit
│   ├── index.test.js          # Core plugin logic
│   ├── server.test.js         # API endpoints
│   └── ui.test.js             # Client-side functions
├── integration
│   ├── config-flow.test.js    # Load, save, reload config
│   ├── preset-flow.test.js    # Preset operations
│   └── event-flow.test.js     # Event triggering
├── fixtures
│   ├── test-config.json       # Sample configs
│   └── test-presets/          # Sample presets
└── setup.js                    # Test environment setup
```

**Test naming convention:**
- Unit tests: `functionName_scenario_expectedBehavior`
- Example: `getRandomSound_emptyArray_returnsNull`
- Example: `loadConfig_missingFile_returnsDefaultConfig`
- Example: `updateVolume_validNumber_updatesStateAndDOM`

**Setup per test suite:**
- Reset mocks before each test
- Clear DOM between UI tests
- Restore fs/spawn mocks to prevent test pollution

---

*Testing analysis: 2026-02-23*
