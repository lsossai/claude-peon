# Codebase Concerns

**Analysis Date:** 2026-02-23

## Security Concerns

**Path Traversal Vulnerability in UI Server:**
- Issue: Multiple API endpoints decode user input and use it in file paths without sufficient validation
- Files: `ui/server.js` (lines 221, 226, 243, 252, 260, 289)
- Risk: Attackers could craft paths like `/api/presets/../../../etc/passwd` or `/api/sounds/play/../../../../etc/passwd` to read arbitrary files on the system
- Current mitigation: Basic `existsSync()` checks, but `join()` resolves `..` traversals before validation occurs
- Recommendation: Validate that decoded names don't contain path separators (`/`, `\`), or use `path.basename()` to strip directory components before joining paths. For example: `const name = path.basename(decodeURIComponent(...))` before any `join()` call

**Static File Serving Vulnerability:**
- Issue: `handleStatic()` in `ui/server.js` (line 289) uses `join(UI_DIR, path)` which is vulnerable to path traversal
- Files: `ui/server.js` (lines 281-298)
- Risk: Attacker could request `/../../index.js` or other sensitive files outside the UI directory
- Current mitigation: `statSync().isFile()` check prevents directory listing but doesn't prevent traversal
- Recommendation: Apply `path.normalize()` and verify the resolved path starts with `UI_DIR`, or use `path.basename()` for single-level lookups

**CORS Not Configured:**
- Issue: UI server has no CORS headers, though may not be exposed beyond localhost
- Files: `ui/server.js`
- Risk: Low (localhost only), but could be accidentally exposed
- Recommendation: Add `Access-Control-Allow-Origin: http://localhost:3456` header if binding to localhost only

## Error Handling Gaps

**Silent Error Swallowing in Config Loading:**
- Issue: `loadConfig()` and `loadPreset()` in both files catch all errors and return defaults without logging
- Files: `index.js` (lines 57-76, 93-105), `ui/server.js` (lines 127-156)
- Impact: Corrupted configs fail silently; users don't know why their settings were lost
- Recommendation: Use `logDebug()` in index.js versions; add error logging to UI server versions for operator visibility

**Unhandled Promise in Preset Loading:**
- Issue: `peon_switch_preset()` tool calls `loadPreset()` synchronously but doesn't validate the result before updating mappings
- Files: `index.js` (lines 348-363)
- Impact: If `loadPreset()` returns `null`, mappings won't update but no error message is shown to user
- Recommendation: Check for `null` explicitly before calling `reloadMappings()`

**File Write Errors Not Propagated:**
- Issue: `appendFile()` in `logDebug()` has no error callback; debug logging silently fails if directory doesn't exist
- Files: `index.js` (line 117)
- Impact: Debug logs lost, making troubleshooting impossible in development
- Recommendation: Use synchronous `appendFileSync()` or add proper error handling to async version

## Race Conditions & Concurrency Issues

**Message/Permission ID Deduplication Race:**
- Issue: `lastMessageId` and `lastPermissionRequestId` state variables are updated after `playMappingSound()` is called
- Files: `index.js` (lines 279-285)
- Impact: If same message ID fires multiple triggers rapidly, the second trigger fires before `lastMessageId` is updated, creating duplicate sounds
- Recommendation: Update state variables immediately after detecting match, before calling `playMappingSound()`, or use a `Set` with timed expiration

**Audio Process Lifecycle Not Managed:**
- Issue: `spawn()` spawns detached child processes with `stdio: "ignore"`, no way to manage concurrent audio
- Files: `index.js` (line 151-154)
- Impact: Sounds can overlap if events fire faster than audio playback; no mechanism to limit concurrent playback or cancel queued sounds
- Recommendation: Maintain a queue of pending sounds with max concurrency; consider stopping previous sound before playing new one

**Synchronous File Writes During Concurrent Reads:**
- Issue: `peon_set_volume` writes config synchronously while other parts might be reading it
- Files: `index.js` (line 395), `ui/server.js` (line 141, 160)
- Impact: Potential race condition where volume changes get lost or corrupted JSON written
- Recommendation: Use a simple lock mechanism or queue writes, or use atomic operations (write to temp file, rename)

## Performance Bottlenecks

**Synchronous File I/O in Hot Paths:**
- Issue: `loadConfig()`, `loadPreset()`, and all file operations in UI server are synchronous
- Files: `index.js` (lines 57-76), `ui/server.js` (lines 127-161)
- Impact: Plugin initialization could block for hundreds of milliseconds if sounds directory is large or mounted on slow storage
- Recommendation: Consider async initialization pattern; cache loaded configs in memory to avoid repeated disk reads

**Sound Directory Traversal on Every Request:**
- Issue: `listSoundsInDirectory()` calls `readdirSync()` on every API request (no caching)
- Files: `ui/server.js` (lines 108-116)
- Impact: If sounds directory has many files, each browse action in UI causes full directory scan
- Recommendation: Cache directory listings in memory, invalidate on file changes

**Random Preset Selection on Every Startup:**
- Issue: `listPresets()` called on startup even if `randomPreset` is false
- Files: `index.js` (lines 176-188)
- Impact: Unnecessary disk I/O on every plugin load
- Recommendation: Move preset selection inside `if (config.randomPreset)` block

## Missing Input Validation

**No Validation of Mapping Configuration:**
- Issue: `reloadMappings()` and preset loading don't validate mapping structure
- Files: `index.js` (lines 190-194), `ui/server.js` (lines 158-161)
- Impact: Malformed mappings (missing `triggers` array, invalid trigger types) won't fail clearly
- Recommendation: Add schema validation or at least null/type checks before accessing mapping properties

**No Volume Range Validation in Config:**
- Issue: Config loading doesn't validate volume is within 1-10 range; only UI-side `peon_set_volume` enforces it
- Files: `index.js` (line 173)
- Impact: Hand-edited configs could set invalid volume values without warning
- Recommendation: Clamp volume to [1, 10] range during config loading

**No Sound File Existence Check:**
- Issue: Mappings reference sound files that may not exist (moved, deleted); no validation at load time
- Files: `index.js`, `openpeon.json`
- Impact: Silent failures when sound files are referenced but missing; user doesn't know why sounds aren't playing
- Recommendation: Validate sound files exist during config load; log warnings for missing files

## Fragile Areas

**Duplicate Code Across API Routes:**
- Issue: Multiple API endpoints repeat similar patterns (path extraction, validation, file operations)
- Files: `ui/server.js` (lines 220-271)
- Why fragile: Each endpoint has to correctly replicate path validation; easy to miss security fixes or introduce inconsistencies
- Safe modification: Extract path validation into helper functions; use consistent patterns for all decodeURIComponent calls
- Test coverage: No tests; manual testing required to verify all endpoints work correctly

**Global Mutable State in Plugin:**
- Issue: `mappings`, `volume`, `lastMessageId`, `lastPermissionRequestId`, `audioDisabled` are module-level state
- Files: `index.js` (lines 121-174)
- Why fragile: Preset switching and volume changes mutate this state; hard to reason about consistency
- Safe modification: Consider centralizing state updates through a single `updateConfig()` function; document which functions modify global state
- Test coverage: No tests; changes to state mutation logic have no verification

**Platform Detection Hardcoded:**
- Issue: `afplayPath` detection uses `Bun?.which?.("afplay")` as primary method, falls back to hardcoded `/usr/bin/afplay`
- Files: `index.js` (line 126)
- Why fragile: Assumes afplay is in `/usr/bin` on all macOS systems; could fail on some installations
- Safe modification: Improve error message when afplay isn't found; document workaround for non-standard installations

## Tech Debt

**No Testing Infrastructure:**
- Impact: No unit tests, integration tests, or e2e tests; changes risk breaking existing functionality
- Files affected: entire codebase
- Fix approach: Add Jest or Vitest configuration; write tests for: path validation in UI, config loading, mapping matching logic, volume calculation

**Inconsistent Error Handling Pattern:**
- Issue: Mix of silent failures (catch blocks with no logging), user-visible errors, and debug-only errors
- Files: `index.js`, `ui/server.js`
- Impact: Hard to predict when errors surface vs. fail silently
- Fix approach: Define error handling policy (user-visible vs. debug vs. critical); apply consistently

**Debug Logging Scattered Throughout Code:**
- Issue: `logDebug()` calls inline throughout index.js make it hard to follow control flow
- Files: `index.js` (14 separate logDebug calls)
- Impact: Difficult to understand what the code is supposed to do vs. what it's logging
- Fix approach: Add comments alongside key logDebug calls explaining what invariants they're checking

**Platform Limiting Without Graceful Degradation:**
- Issue: Plugin disables all functionality on non-macOS but doesn't notify user clearly
- Files: `index.js` (lines 128-134)
- Impact: Plugin silently stops working if installed on Linux/Windows; user doesn't know why
- Fix approach: Add warning to plugin UI if afplay isn't available; explain platform limitations clearly

**No Configuration Persistence Model:**
- Issue: Config changes saved to disk via imperative `writeFileSync()` calls; no unified persistence layer
- Files: `index.js` (line 395), `ui/server.js` (lines 140-141, 160)
- Impact: Easy to miss saving state in some code path; inconsistent save behavior
- Fix approach: Create ConfigManager class that handles all persistence; ensures all changes are saved

## Missing Critical Features

**No Preset Validation/Merge:**
- Impact: Switching to a broken preset could silence all sounds; user has no way to recover
- Files: `index.js` (lines 348-363)
- Recommendation: Add preset validation schema; provide rollback mechanism if active preset becomes invalid

**No Sound Playback Limiting:**
- Impact: Rapid events can queue hundreds of sounds, overwhelming the audio system
- Files: `index.js` (lines 138-167)
- Recommendation: Add configurable max concurrent audio tracks; drop oldest sounds if queue exceeds limit

**No Logging of Actual Sound Playback Success:**
- Impact: Can't tell if a sound played or failed to play (vs. just being triggered)
- Files: `index.js` (lines 149-166)
- Recommendation: Log when afplay process completes; distinguish between "triggered" and "actually played"

## Known Issues

**Sounds Can Overlap and Interfere:**
- Symptoms: Multiple triggers firing rapidly result in layered audio making output unintelligible
- Files: `index.js` (line 151-154)
- Cause: Each trigger spawns independent audio process; no single-flight or debounce
- Workaround: Lower volume or disable whisper sounds to reduce frequency

**Debug Log Directory May Not Exist:**
- Symptoms: `OPENPEON_DEBUG=1` produces no log file; appendFile fails silently
- Files: `index.js` (line 117)
- Cause: `appendFile()` without directory creation; assumes `~/.config/opencode/` exists
- Workaround: Create directory manually: `mkdir -p ~/.config/opencode`

---

*Concerns audit: 2026-02-23*
