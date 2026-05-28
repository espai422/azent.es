# Browser MCP Tools — Design Spec
**Date:** 2026-05-28

## Context

The AZENT landing page is an "agentic web" where a Codex agent can read and modify the page live as it converses with the visitor. The page is composed of visual blocks (`SectionConfig`) managed via a React context (`SectionProvider`). The agent communicates with the browser through an MCP server that dispatches tool calls over an SSE channel to a client-side bridge (`BrowserToolBridge`).

This spec replaces all existing browser MCP tools with a smaller, purpose-built set aligned to the agent's actual workflow.

---

## Goals

1. A single `focus_section` tool that scrolls to a block and highlights it (replacing the current separate scroll + highlight tools).
2. `get_page_snapshot` returns the full HTML content of every block so the agent can read and be inspired by the current page state.
3. `add_agent_block` creates a new conversational block at the end of the page with a visible `topic` label (the `<small>` tag) contextualising what it's responding to.
4. `append_to_block` enables incremental HTML building — the agent calls it multiple times with small chunks to create a streaming-like writing effect.
5. `set_block_html` allows full editing/refactoring of a block's HTML and optionally its topic.
6. `remove_block` for cleanup.

---

## Data Model Changes

### `SectionConfig` — add `topic` field

```typescript
export interface SectionConfig {
  id: string
  theme: SectionTheme
  tab: TabVariant
  rule?: boolean
  content: string
  topic?: string    // NEW: visible <small> label for agent-created blocks
  className?: string
}
```

`SectionInput` gets the same optional `topic?: string`.

The existing reducer actions (`ADD`, `UPDATE`) already support arbitrary partial updates, so no new actions are needed.

### `Block.tsx` — render `topic` and expose DOM id

Two changes:
1. Add `id={config.id}` to the `<section>` element so `focus_section` can find it via `document.getElementById()`.
2. Render `{config.topic && <small>{config.topic}</small>}` above `block-content` when the field is present.

Rendered structure for an agent block:
```html
<section id="abc123" data-theme="dark-1" ...>
  <small>Sobre la automatización de procesos</small>
  <div class="block-content">
    <h2>Cómo eliminamos trabajo manual en tu equipo</h2>
    <p>...</p>
  </div>
</section>
```

---

## New Tool Set (replaces all existing tools)

All tools require `sessionId` (the ephemeral browser session id for the current tab).

### `get_page_snapshot`
Returns the current page state.

**Output:** `{ title: string, url: string, sections: Array<{ id, index, theme, tab, topic?, content }> }`

`content` is the raw HTML string currently rendered in the block. The agent uses this to understand the current page state, avoid duplicating content, and draw inspiration from existing blocks when creating new ones.

---

### `focus_section(sessionId, id)`
Brings a section into view and highlights it.

**Behaviour:**
1. Finds the element via `document.getElementById(id)`.
2. Checks if it's fully in the viewport (`getBoundingClientRect`). If not, calls `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
3. Runs the orange border flash animation (same `element.animate()` as the current `highlight_section`).

**Use when:** the visitor asks about something that has a corresponding block on the page.

---

### `set_document_title(sessionId, title)`
Updates `document.title`. No behavioural changes from the current tool.

---

### `add_agent_block(sessionId, topic)`
Creates a new empty block at the end of the page.

**Input:** `topic` — the short text that will appear as `<small>` in the block. Should explain what the block is responding to (e.g., "Sobre la automatización de procesos").

**Behaviour:** dispatches `ADD` with `{ content: '', topic }`. Theme and tab are auto-assigned by the existing cycle logic.

**Output:** `{ id }` — the agent must save this id to call `append_to_block` and `set_block_html` afterwards.

---

### `append_to_block(sessionId, id, html)`
Appends an HTML fragment to the end of a block's current content.

**Use for incremental building:** the agent calls this multiple times with small chunks after `add_agent_block`:
1. `append_to_block(id, '<h2>Section title</h2>')`
2. `append_to_block(id, '<p>First sentence or two.</p>')`
3. `append_to_block(id, '<p>Next paragraph...</p>')`
4. …

This creates a streaming writing effect visible to the visitor in real time. Each chunk should be 1–2 sentences or one structural element. Always use Tailwind utility classes for any inline styling, ensuring mobile-first responsive design.

**Implementation note:** the bridge reads `sectionsRef.current` to find the current content and calls `updateSection(id, { content: currentContent + html })`.

---

### `set_block_html(sessionId, id, html, topic?)`
Replaces the full HTML content of a block. Optionally updates the `topic` label at the same time.

**Use for:** editing an existing block when the visitor brings up something related to a previous response, refactoring a block that has grown too large, or correcting earlier content.

**Size guidance:** agent blocks should not exceed roughly 5× the length of the existing static landing blocks. If a block grows beyond this, either split it (call `set_block_html` to trim the first block and `add_agent_block` for the overflow) or keep it focused.

---

### `remove_block(sessionId, id)`
Removes a block by id.

---

## AGENTS.md Updates

The following sections must be added/updated in `.codex-browser-agent/AGENTS.md`:

### Replace the existing "Browser Control via MCP" section with:

**Tool inventory:**
- `get_page_snapshot` — always call this first to understand the current page state before making any changes.
- `focus_section` — scroll to a block and flash the orange border. Use when the visitor asks about something that maps to an existing section.
- `set_document_title` — update the browser tab title.
- `add_agent_block` — create a new block at the end of the page. Provide a short `topic` label that contextualises what this block is responding to.
- `append_to_block` — add HTML to a block incrementally. Call multiple times with small chunks (one heading, one paragraph at a time) to create a live writing effect.
- `set_block_html` — replace a block's full HTML. Use for edits, refactors, or corrections. Optionally update `topic`.
- `remove_block` — delete a block.

**Response workflow:**
1. Call `get_page_snapshot` to read the current page state.
2. If the visitor's question relates to an existing section, call `focus_section` first to draw their attention to it.
3. If a new response block is needed, call `add_agent_block` with a short topic label. Save the returned `id`.
4. Build the block incrementally with `append_to_block`: start with `<h2>`, then add paragraphs one at a time. Each call should be 1–2 sentences or one structural element.
5. If the visitor revisits a previous topic, use `set_block_html` to update the relevant block rather than creating a new one.

**Content and style rules:**
- Use Tailwind utility classes for all styling within the HTML. Think mobile-first; every block must look good on both mobile and desktop.
- Never add decorative borders in orange — orange is reserved for the system highlight animation.
- Keep blocks focused. If a block approaches ~5× the length of the static landing blocks, split the content across two blocks or refactor.
- The `topic` label (`<small>`) should be brief and natural — it contextualises the block for the visitor, not for the agent. Example: "Sobre automatización de procesos", not "Response to user query about automation".
- The section `<h2>` title should read like a normal landing page section heading, not like a chat reply.

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/sections/SectionContext.tsx` | Add `topic?: string` to `SectionConfig` and `SectionInput` |
| `src/components/sections/Block.tsx` | Add `id={config.id}` to `<section>`; render `topic` as `<small>` |
| `src/components/BrowserToolBridge.tsx` | Replace all tool handlers with the new 7-tool set |
| `src/server/browserMcp.ts` | Replace all `registerTool` calls with the new 7 tools |
| `.codex-browser-agent/AGENTS.md` | Replace "Browser Control via MCP" section |

No new files needed. No route changes needed.

---

## Out of Scope

- Reordering/moving blocks (removed — not part of the new workflow)
- Changing block theme/tab after creation (removed — auto-assigned on creation)
- `replace_all_sections` (removed — too destructive for conversational use)
