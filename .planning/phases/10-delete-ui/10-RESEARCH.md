# Phase 10: Delete UI - Research

**Researched:** 2026-02-24
**Domain:** Vanilla JS UI mutation — delete button, confirm dialog, fetch, toast, panel refresh
**Confidence:** HIGH

## Summary

Phase 9 shipped `deleteHook(event, groupIndex)` and `DELETE /api/hooks` in `ui/server.js`. The endpoint is live, validated, and waiting for a client. Phase 10 is purely a UI-layer change: wire delete buttons into the existing read-only Active Hooks panel so each hook group row has a working delete action.

All required primitives already exist in `ui/index.html`. The `.btn-delete` CSS class is defined and used on mapping/trigger/sound rows. `showToast(message, type)` is already the standard mutation feedback mechanism. `loadActiveHooks()` already fetches and re-renders the panel from the server — calling it after a successful delete is sufficient for panel refresh with no full page reload. The `deletePreset()` function establishes the exact UX pattern: `confirm()` before fetch, toast on result, reload list on success. `deleteHookGroup()` mirrors this pattern exactly.

The only structural change to the existing `loadActiveHooks()` render loop is changing `groups.map(group => ...)` to `groups.map((group, gi) => ...)` to expose the positional group index, then adding a delete button to each `hook-group-row`. A new `async function deleteHookGroup(eventName, groupIndex)` handles the confirm + fetch + toast + reload sequence. The confirmation message must include the event name and command string. Because the command string may contain special characters (spaces, slashes, single quotes), it must NOT be inlined into an `onclick` attribute — instead, it should be stored in a small JS Map at render time and looked up by `eventName:groupIndex` key inside the function body.

The requirements also call for distinct confirmation text for peon vs external hooks (DEL-03). The `isPeon` boolean is already computed in the render loop from `group._claude_peon`; this value must be passed alongside event name and group index either as a third `onclick` argument or stored in the same JS Map. Peon confirmation text should note "This will delete the hook registration. Re-install with Apply." to distinguish reversible (peon) from potentially permanent (external) deletions.

**Primary recommendation:** Add one render-time JS Map, change one `.map()` call to include index, add one button per row, add one `deleteHookGroup()` function. Zero new dependencies, zero new CSS, zero server changes.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEL-01 | User can delete any individual hook group from the Active Hooks panel via a delete button | Delete button added per row inside `loadActiveHooks()` render; server endpoint ready in Phase 9 |
| DEL-02 | User sees a confirmation dialog before deletion proceeds | `confirm()` dialog before fetch — same pattern as `deletePreset()` and `removeHooks()` |
| DEL-03 | Confirmation text distinguishes peon hooks (warns mapping will be removed) from external hooks | `isPeon` already computed in render loop; stored in JS Map alongside command string for use in confirm message |
| DEL-04 | Active Hooks panel refreshes automatically after a successful deletion | Call `loadActiveHooks()` after `{ success: true }` response — no page reload needed |
| DEL-05 | User sees a toast notification confirming the hook was deleted | `showToast(message, 'success')` after success; `showToast(message, 'error')` on failure — same as every other mutation |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (inline `<script>`) | ES2022 | All UI logic | Existing pattern — no build step, no bundler |
| Bun `fetch` API | Built-in | HTTP client in browser | Already used for all existing API calls |
| `confirm()` | Browser built-in | Synchronous confirmation dialog | Already used by `deletePreset()` and `removeHooks()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `showToast(message, type)` | Existing helper | Success/error feedback | After every mutation result |
| `loadActiveHooks()` | Existing function | Re-fetch and re-render Active Hooks panel | After successful delete to refresh panel |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `confirm()` dialog | Custom modal overlay | `confirm()` is synchronous and already consistent with existing pattern; modal adds code for no UX gain here |
| JS Map for storing row metadata | `data-` attributes on DOM elements | Data attributes risk XSS if command strings contain `"` or `'`; JS Map at render time is safer and simpler |
| `onclick` with inlined third argument | JS Map lookup | Inlining command string in onclick is fragile with special characters; Map is safer |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new files. All changes are confined to `ui/index.html`.

```
ui/
├── index.html    # Add deleteHookGroup(), extend loadActiveHooks()
└── server.js     # No changes — Phase 9 already shipped DELETE /api/hooks
```

### Pattern 1: Render-Time JS Map for Row Metadata

**What:** At render time inside `loadActiveHooks()`, populate a module-level `Map` keyed by `"eventName:groupIndex"` with the row's metadata (command string, isPeon boolean). The delete button `onclick` passes only the primitive key components; the function body reads metadata from the map.

**When to use:** Whenever row metadata contains strings that are unsafe to inline into HTML `onclick` attributes (command paths with spaces, slashes, special characters).

**Example:**
```javascript
// Module-level map — reset on each render
let hookRowMeta = new Map()

async function loadActiveHooks() {
  hookRowMeta = new Map()   // reset before re-render
  // ... fetch ...
  const groups = hooks[eventName]
  groups.map((group, gi) => {
    const isPeon = group._claude_peon === true
    const cmd = group.hooks && group.hooks[0] ? group.hooks[0].command : ""
    hookRowMeta.set(`${eventName}:${gi}`, { cmd, isPeon })
    // render button: onclick="deleteHookGroup('${eventName}', ${gi})"
  })
}
```

### Pattern 2: deleteHookGroup() — Mirrors deletePreset()

**What:** Async function that confirms, fetches `DELETE /api/hooks` with JSON body, shows toast, and calls `loadActiveHooks()` on success.

**When to use:** The standard mutation pattern for every destructive action in this UI.

**Example:**
```javascript
async function deleteHookGroup(eventName, groupIndex) {
  const meta = hookRowMeta.get(`${eventName}:${groupIndex}`)
  if (!meta) {
    showToast('Hook row not found — please reload', 'error')
    return
  }

  const { cmd, isPeon } = meta
  const safeCmd = cmd.length > 60 ? cmd.slice(0, 57) + '...' : cmd
  const peonNote = isPeon
    ? '\n\nThis will delete the hook registration. Re-install with Apply.'
    : '\n\nThis hook was not installed by claude-peon. Deletion may be permanent.'
  const message = `Delete hook on ${eventName}?\n\n${safeCmd}${peonNote}`

  if (!confirm(message)) return

  try {
    const res = await fetch('/api/hooks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, groupIndex }),
    })
    const result = await res.json()
    if (result.success) {
      showToast(`Deleted hook from ${eventName}`, 'success')
      await loadActiveHooks()
    } else {
      showToast(`Delete failed: ${result.error}`, 'error')
    }
  } catch (err) {
    showToast(`Delete error: ${err.message}`, 'error')
  }
}
```

### Pattern 3: Extending loadActiveHooks() Render Loop

**What:** Expose group index in the `.map()` callback and add a delete button to each `.hook-group-row`.

**When to use:** Every row in the Active Hooks panel needs a delete button.

**Example:**
```javascript
// BEFORE (Phase 8)
const groupRows = groups.map(group => {
  // ...
  return `<div class="hook-group-row">...</div>`
})

// AFTER (Phase 10)
const groupRows = groups.map((group, gi) => {
  const isPeon = group._claude_peon === true
  const cmd = group.hooks && group.hooks[0] ? group.hooks[0].command : ""
  hookRowMeta.set(`${eventName}:${gi}`, { cmd, isPeon })
  // ...
  return `<div class="hook-group-row">
    ...existing content...
    <button class="btn-delete btn-sm" onclick="deleteHookGroup('${eventName}', ${gi})">×</button>
  </div>`
})
```

### Anti-Patterns to Avoid

- **Inlining command string in onclick attribute:** `onclick="deleteHookGroup('${eventName}', ${gi}, '${cmd}')"` — command strings contain spaces, slashes, and may contain single or double quotes. This will break the HTML or enable XSS. Use the JS Map approach instead.
- **Full page reload after delete:** `location.reload()` resets any in-progress edits in the Mappings editor. Use `loadActiveHooks()` to refresh only the hooks panel.
- **Fetching command string on confirm:** Do not make a second API call inside `deleteHookGroup()` to retrieve the command for display. The command is already available at render time; store it in the Map.
- **Passing isPeon as a string in onclick:** `onclick="deleteHookGroup('${eventName}', ${gi}, ${isPeon})"` — boolean primitive is safe in onclick; string versions like `'true'`/`'false'` are truthy JS strings. Either use the boolean primitive directly or use the JS Map. The Map approach is recommended because it also carries the command string.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog | Custom modal overlay | `confirm()` | Already consistent with existing UI; `deletePreset()` and `removeHooks()` both use it |
| Toast feedback | New notification system | `showToast(message, type)` | Already defined and used for every mutation |
| Panel refresh | DOM splice / manual removal | `loadActiveHooks()` re-fetch | Server is the source of truth; re-fetch is simple and correct; handles concurrent edits |
| HTTP client | XHR / XMLHttpRequest | `fetch()` | Already used throughout |

**Key insight:** Every piece of UI infrastructure needed for this feature already exists and is used. The work is wiring it together, not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Special Characters in onclick Attributes
**What goes wrong:** Command strings like `/Users/x/.nvm/versions/node/v22.0.0/bin/node /path/to/play.js` contain spaces, slashes, and can contain single quotes. Inlining into `onclick="fn('...')"` produces invalid HTML or silently truncates the argument.
**Why it happens:** Developers treat command strings as safe display text when they're actually arbitrary shell strings.
**How to avoid:** Store command string in a `Map` at render time. The `onclick` attribute only passes primitive event name (safe string from settings.json event keys — only alphanumeric) and group index (integer). Read command from the Map inside the function.
**Warning signs:** If you see the command string appearing directly inside an `onclick` attribute value, it's wrong.

### Pitfall 2: Stale Index After Back-to-Back Deletes
**What goes wrong:** User deletes group at index 1, panel refreshes, now clicks delete on what was group 2 (now at index 1). If the second click is processed before the panel re-renders, the old index 2 targets the wrong group.
**Why it happens:** Positional array indices are unstable across mutations.
**How to avoid:** The `loadActiveHooks()` re-render after each successful delete resets `hookRowMeta` with fresh indices. The delete buttons in the DOM are replaced by the re-render. There is no window for stale index reuse as long as `await loadActiveHooks()` completes before the user can click again (which it does, since it's async and the DOM is replaced when it resolves).
**Warning signs:** If delete buttons are not re-rendered after each delete (e.g., only partial DOM update), stale indices become possible.

### Pitfall 3: hookRowMeta Not Reset on Re-render
**What goes wrong:** If `hookRowMeta` is not cleared at the start of each `loadActiveHooks()` call, deleted rows leave stale entries. After a re-render, `hookRowMeta.get('Stop:0')` may return data for a group that no longer exists at that index.
**Why it happens:** Map accumulates entries across renders without clearing.
**How to avoid:** First line of `loadActiveHooks()` (after fetching): `hookRowMeta = new Map()`. This ensures the map always matches the current DOM.
**Warning signs:** Deleting a hook, seeing the panel refresh, and then finding the confirm dialog shows the old (deleted) hook's command string.

### Pitfall 4: removeHooks() After Delete Not Refreshing Panel
**What goes wrong:** The existing `removeHooks()` toolbar button removes ALL peon hooks but does not call `loadActiveHooks()`. After Phase 10, users may notice the panel does not refresh after Remove.
**Why it happens:** `removeHooks()` was written before the Active Hooks panel existed (Phase 8 added the panel).
**How to avoid:** Add `await loadActiveHooks()` to the success branch of the existing `removeHooks()` client function. This is a one-line fix and should be included in Phase 10 for consistency.
**Warning signs:** Clicking "Remove" button, seeing the success toast, but the Active Hooks panel still showing the old peon hooks.

### Pitfall 5: applyHooks() After Apply Not Refreshing Panel
**What goes wrong:** Same as Pitfall 4 — `applyHooks()` client function does not call `loadActiveHooks()` after success. The panel shows stale data after Apply.
**How to avoid:** Add `await loadActiveHooks()` to the success branch of the existing `applyHooks()` client function. Include in Phase 10.

---

## Code Examples

Verified patterns from direct codebase inspection (`ui/index.html` and `ui/server.js`):

### Existing deletePreset() — Template to Mirror
```javascript
// Source: ui/index.html — lines 959-976
async function deletePreset(name, event) {
  event.stopPropagation()
  if (!confirm(`Delete preset "${name}"?`)) {
    return
  }
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
}
```

### Existing DELETE /api/hooks Endpoint — Phase 9 Output
```javascript
// Source: ui/server.js — lines 466-485
if (path === "/api/hooks" && req.method === "DELETE") {
  return req.json().then((body) => {
    const { event, groupIndex } = body
    if (typeof event !== "string" || typeof groupIndex !== "number" || groupIndex < 0) {
      return Response.json(
        { success: false, error: "event (string) and groupIndex (number >= 0) are required" },
        { status: 400 }
      )
    }
    try {
      const result = deleteHook(event, groupIndex)
      if (!result.success) {
        return Response.json(result, { status: 400 })
      }
      return Response.json(result)
    } catch (error) {
      return Response.json({ success: false, error: error?.message ?? "Unknown error" }, { status: 500 })
    }
  })
}
```

### Existing loadActiveHooks() Render Structure — Starting Point
```javascript
// Source: ui/index.html — lines 857-898
// Current groups.map() — MUST become groups.map((group, gi) => ...)
const groupRows = groups.map(group => {
  const isPeon = group._claude_peon === true
  const badgeClass = isPeon ? "hook-badge-peon" : "hook-badge-external"
  const badgeLabel = isPeon ? "peon" : "external"
  const cmd = group.hooks && group.hooks[0] ? group.hooks[0].command : ""
  const isAsync = group.hooks && group.hooks[0] && group.hooks[0].async === true
  const asyncBadge = isAsync ? '<span class="hook-badge hook-badge-async">async</span>' : ""
  const matcherBadge = group.matcher ? `<span class="hook-badge hook-badge-matcher">${group.matcher}</span>` : ""
  return `<div class="hook-group-row">
    <span class="hook-badge ${badgeClass}">${badgeLabel}</span>
    ${matcherBadge}
    ${asyncBadge}
    <span class="hook-command">${cmd.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
  </div>`
}).join("")
```

### Existing showToast() — Call Signature
```javascript
// Source: ui/index.html — lines 1205-1212
function showToast(message, type) {
  const toast = document.getElementById("toast")
  toast.textContent = message
  toast.className = `toast show ${type}`
  setTimeout(() => {
    toast.classList.remove("show")
  }, 3000)
}
// Usage: showToast("message", "success") or showToast("message", "error")
```

### Existing .btn-delete CSS — No New Styles Needed
```css
/* Source: ui/index.html — lines 140-151 */
.btn-delete {
  background: transparent;
  color: var(--text-muted);
  border: none;
  padding: 6px 10px;
  font-size: 14px;
  font-weight: bold;
}
.btn-delete:hover {
  color: var(--danger);
}
/* Used in hook rows with .btn-sm: padding 6px 12px, font-size 13px */
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Read-only Active Hooks panel | Interactive panel with per-row delete buttons | Phase 10 (this phase) | Users can remove hooks without editing settings.json manually |
| No panel refresh after Apply/Remove | Panel refreshes after Apply, Remove, and per-row delete | Phase 10 (this phase) | Panel always reflects current file state |
| `groups.map(group => ...)` in render | `groups.map((group, gi) => ...)` | Phase 10 (this phase) | Group index available for delete targeting |

**Deprecated/outdated:**
- `removeHooks()` and `applyHooks()` client functions that don't refresh the Active Hooks panel — still functional but visually inconsistent after Phase 10 adds per-row delete with panel refresh. Fix both in this phase for consistency.

---

## Open Questions

1. **Whether to fix applyHooks() and removeHooks() panel refresh in this phase**
   - What we know: Both functions omit `loadActiveHooks()` after success. After Phase 10, users will notice the panel refreshes after per-row delete but not after Apply/Remove.
   - What's unclear: Whether this is in scope for Phase 10 or should be a separate small fix.
   - Recommendation: Include as two one-line additions in Phase 10. The fix is trivial and the inconsistency is jarring once per-row delete exists.

---

## Sources

### Primary (HIGH confidence)
- `/Users/lucassossai/dev/pessoal/claude-peon/ui/index.html` — direct inspection: `loadActiveHooks()` render loop (lines 857-898), `deletePreset()` pattern (lines 959-976), `showToast()` (lines 1205-1212), `.btn-delete` CSS (lines 140-151), `applyHooks()` and `removeHooks()` client functions (lines 1214-1255)
- `/Users/lucassossai/dev/pessoal/claude-peon/ui/server.js` — direct inspection: `DELETE /api/hooks` route (lines 466-485), `deleteHook()` function (lines 184-211), request/response contract
- `/Users/lucassossai/dev/pessoal/claude-peon/.planning/phases/09-delete-api/09-01-SUMMARY.md` — Phase 9 decisions: server agnostic, 400 on out-of-bounds, settings.json only (no claude-peon.json cascade)
- `/Users/lucassossai/dev/pessoal/claude-peon/.planning/REQUIREMENTS.md` — DEL-01 through DEL-05 verbatim requirements

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — feature analysis: JS Map for metadata storage, onclick escaping pitfall, peon vs external confirm text, panel refresh via loadActiveHooks()
- `.planning/research/SUMMARY.md` — architecture decisions: no new dependencies, additive changes only, build order

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing code inspected directly; no new dependencies; all primitives identified
- Architecture: HIGH — one new function, two modified call sites, one module-level variable; no structural ambiguity
- Pitfalls: HIGH — onclick escaping pitfall and stale index are concrete risks traced from the live source; Map reset pitfall is mechanical and verifiable; Apply/Remove refresh gap is observable in the current code

**Research date:** 2026-02-24
**Valid until:** Until `ui/index.html` or `ui/server.js` changes — stable for at least 30 days given recent velocity
