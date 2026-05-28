# Browser MCP Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all existing browser MCP tools with a focused 7-tool set that supports incremental block building, combined scroll+highlight, and agent-created blocks with a visible `topic` label.

**Architecture:** `SectionConfig` gains `topic?: string` and an optional pre-generated `id` on input. `Block.tsx` renders the topic as `<small>` and exposes the section's id as a DOM attribute. `BrowserToolBridge.tsx` replaces 10 tool handlers with 7. `browserMcp.ts` replaces 10 `registerTool` calls with 7. `AGENTS.md` gets updated usage instructions.

**Tech Stack:** React, TypeScript, Zod v4, `@modelcontextprotocol/sdk`, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-05-28-browser-mcp-tools-design.md`

---

## Task 1: Extend SectionContext with `topic` and pre-generatable `id`

**Files:**
- Modify: `src/components/sections/SectionContext.tsx`
- Test: `src/components/sections/SectionContext.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/components/sections/SectionContext.test.ts`, inside the existing `describe('resolveSection — id + content', ...)` block:

```typescript
it('preserves topic', () => {
  expect(resolveSection({ content: '', topic: 'Sobre IA' }, 0).topic).toBe('Sobre IA')
})

it('topic is undefined when not provided', () => {
  expect(resolveSection({ content: '' }, 0).topic).toBeUndefined()
})

it('uses pre-generated id when provided', () => {
  expect(resolveSection({ content: '', id: 'pre-set' }, 0).id).toBe('pre-set')
})

it('generates a new id when id is not provided', () => {
  expect(resolveSection({ content: '' }, 0).id).toBeTruthy()
})
```

And inside the existing `describe('sectionsReducer', ...)` block:

```typescript
it('ADD preserves topic', () => {
  const state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'hi', topic: 'Test topic' } })
  expect(state.sections[0].topic).toBe('Test topic')
})

it('UPDATE can patch topic', () => {
  let state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'a' } })
  const { id } = state.sections[0]
  state = sectionsReducer(state, { type: 'UPDATE', id, payload: { topic: 'New topic' } })
  expect(state.sections[0].topic).toBe('New topic')
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run src/components/sections/SectionContext.test.ts
```

Expected: all new tests fail with type errors or assertion failures.

- [ ] **Step 3: Update `SectionConfig`, `SectionInput`, and `resolveSection`**

In `src/components/sections/SectionContext.tsx`, make these changes:

**`SectionConfig`** — add `topic`:
```typescript
export interface SectionConfig {
  id: string
  theme: SectionTheme
  tab: TabVariant
  rule?: boolean
  content: string
  topic?: string
  className?: string
}
```

**`SectionInput`** — add `id` and `topic`:
```typescript
export type SectionInput = {
  id?: string
  theme?: SectionTheme
  tab?: TabVariant
  rule?: boolean
  content: string
  topic?: string
  className?: string
}
```

**`resolveSection`** — use `input.id` when provided, pass through `topic`:
```typescript
export function resolveSection(input: SectionInput, nonClosingCount: number): SectionConfig {
  const theme = input.theme ?? COLOR_CYCLE[nonClosingCount % 4]
  const tab = theme === 'closing' ? 'none' : (input.tab ?? TAB_CYCLE[nonClosingCount % 3])
  return {
    id: input.id ?? createId(),
    theme,
    tab,
    rule: input.rule,
    content: input.content,
    topic: input.topic,
    className: input.className,
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run src/components/sections/SectionContext.test.ts
```

Expected: all tests pass (new and existing).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/SectionContext.tsx src/components/sections/SectionContext.test.ts
git commit -m "feat: add topic and optional pre-generated id to SectionConfig"
```

---

## Task 2: Update Block to render `topic` and expose DOM id

**Files:**
- Modify: `src/components/sections/Block.tsx`
- Test: `src/components/sections/Block.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/components/sections/Block.test.tsx`, inside the existing `describe('Block', ...)` block:

```typescript
it('sets id attribute from config.id', () => {
  const { container } = render(<Block config={base} index={0} prevTab="none" />)
  expect(container.querySelector('#test-id')).toBeTruthy()
})

it('renders topic as <small> when present', () => {
  render(<Block config={{ ...base, topic: 'Sobre precios' }} index={0} prevTab="none" />)
  expect(screen.getByText('Sobre precios', { selector: 'small' })).toBeTruthy()
})

it('does not render <small> when topic is absent', () => {
  const { container } = render(<Block config={base} index={0} prevTab="none" />)
  expect(container.querySelector('small')).toBeNull()
})
```

Note: `base` already has `id: 'test-id'`, so the first test will use that.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run src/components/sections/Block.test.tsx
```

Expected: 3 new tests fail.

- [ ] **Step 3: Update Block component**

Replace `src/components/sections/Block.tsx` with:

```typescript
import type { SectionConfig, TabVariant } from './SectionContext'

interface BlockProps {
  config: SectionConfig
  index: number
  prevTab: TabVariant
}

const CLIP_BOTTOM: Record<TabVariant, string> = {
  center: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), 64% calc(100% - 12px), 64% 100%, 36% 100%, 36% calc(100% - 12px), 0 calc(100% - 12px))',
  right:  'polygon(0 0, 100% 0, 100% calc(100% - 12px), 85% calc(100% - 12px), 85% 100%, 57% 100%, 57% calc(100% - 12px), 0 calc(100% - 12px))',
  left:   'polygon(0 0, 100% 0, 100% calc(100% - 12px), 43% calc(100% - 12px), 43% 100%, 15% 100%, 15% calc(100% - 12px), 0 calc(100% - 12px))',
  none:   '',
}

export function Block({ config, index, prevTab }: BlockProps) {
  const clipPath = CLIP_BOTTOM[config.tab] || undefined
  const marginTop = index === 0 || prevTab === 'none' ? 0 : -12

  return (
    <section
      id={config.id}
      data-theme={config.theme}
      data-tab={config.tab}
      className={`block-section${config.className ? ` ${config.className}` : ''}`}
      style={{ clipPath, marginTop, position: 'relative', zIndex: 1000 - index * 10 }}
    >
      {config.rule && <div className="block-rule" aria-hidden="true" />}
      {config.topic && <small>{config.topic}</small>}
      <div
        className="block-content"
        dangerouslySetInnerHTML={{ __html: config.content }}
      />
    </section>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run src/components/sections/Block.test.tsx
```

Expected: all tests pass (new and existing).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Block.tsx src/components/sections/Block.test.tsx
git commit -m "feat: render topic label and expose id on Block section element"
```

---

## Task 3: Replace BrowserToolBridge tool handlers

**Files:**
- Modify: `src/components/BrowserToolBridge.tsx`

The 10 existing tools are replaced by 7. Unused helpers (`SECTION_THEMES`, `TAB_VARIANTS`, `readBoolean`, `readTheme`, `readTab`, `readSectionInput`) and unused imports (`SectionTheme`, `TabVariant`) are removed.

- [ ] **Step 1: Replace `BrowserToolBridge.tsx` entirely**

```typescript
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSections, type SectionInput } from '#/components/sections'
import { createId } from '#/utils/id'

type BrowserToolEvent =
  | { type: 'session.ready'; sessionId: string }
  | { type: 'heartbeat'; now: number }
  | { type: 'tool.call'; callId: string; toolName: string; args: unknown }

type ToolResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: string }

const SESSION_STORAGE_KEY = 'azent.browserSessionId'

function getSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const next = createId()
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next)
  return next
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function BrowserToolBridge() {
  const { sections, addSection, updateSection, removeSection } = useSections()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sectionsRef = useRef(sections)

  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  const tools = useMemo(() => ({
    get_page_snapshot: () => ({
      title: document.title,
      url: window.location.href,
      sections: sectionsRef.current.map((section, index) => ({ index, ...section })),
    }),

    set_document_title: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const title = readString(args.title).trim()
      if (!title) throw new Error('title is required')
      document.title = title
      return { title }
    },

    focus_section: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      if (!id) throw new Error('id is required')
      const element = document.getElementById(id)
      if (!element) throw new Error(`Section not found: ${id}`)
      const rect = element.getBoundingClientRect()
      const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
      if (!isInView) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      element.animate(
        [
          { outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
          { outlineColor: 'rgba(255,107,43,0.9)', outlineOffset: '-10px' },
          { outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
        ],
        { duration: 1_200, easing: 'ease-out' },
      )
      return { id }
    },

    add_agent_block: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const topic = readString(args.topic).trim()
      if (!topic) throw new Error('topic is required')
      const newId = createId()
      addSection({ id: newId, content: '', topic })
      return { id: newId }
    },

    append_to_block: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const html = readString(args.html).trim()
      if (!id || !html) throw new Error('id and html are required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      updateSection(id, { content: section.content + html })
      return { id }
    },

    set_block_html: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const html = readString(args.html).trim()
      if (!id || !html) throw new Error('id and html are required')
      const updates: Partial<SectionInput> = { content: html }
      if (typeof args.topic === 'string' && args.topic.trim()) {
        updates.topic = args.topic.trim()
      }
      updateSection(id, updates)
      return { id, updated: true }
    },

    remove_block: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      if (!id) throw new Error('id is required')
      removeSection(id)
      return { id, removed: true }
    },
  }), [addSection, removeSection, updateSection])

  useEffect(() => {
    const nextSessionId = getSessionId()
    setSessionId(nextSessionId)

    window.dispatchEvent(new CustomEvent('azent:browser-session', { detail: { sessionId: nextSessionId } }))

    const source = new EventSource(`/api/browser-session/events?sessionId=${encodeURIComponent(nextSessionId)}`)

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as BrowserToolEvent
      if (payload.type !== 'tool.call') return

      void (async () => {
        const tool = tools[payload.toolName as keyof typeof tools]
        let response: ToolResponse

        try {
          response = tool
            ? { ok: true, result: await tool(payload.args) }
            : { ok: false, error: `Unknown browser tool: ${payload.toolName}` }
        } catch (error) {
          response = {
            ok: false,
            error: error instanceof Error ? error.message : 'Browser tool failed',
          }
        }

        await fetch('/api/browser-tools/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: nextSessionId,
            callId: payload.callId,
            ...response,
          }),
        })
      })()
    }

    return () => source.close()
  }, [tools])

  return (
    <div
      data-browser-session-id={sessionId || undefined}
      hidden
      title={sessionId || undefined}
    />
  )
}
```

- [ ] **Step 2: Run the full test suite and type check**

```bash
pnpm test
```

Expected: all tests pass. TypeScript should have no errors (`noUnusedLocals` is enabled — confirm the removed imports don't leave stale references).

- [ ] **Step 3: Commit**

```bash
git add src/components/BrowserToolBridge.tsx
git commit -m "feat: replace browser tool handlers with 7-tool agent set"
```

---

## Task 4: Replace MCP server tool registrations

**Files:**
- Modify: `src/server/browserMcp.ts`

- [ ] **Step 1: Replace the tool registrations in `browserMcp.ts`**

Replace the `createBrowserMcpServer` function body with the new 7 tools. The `invoke` helper, `handleBrowserMcpRequest`, and `browserMcpCorsHeaders` are unchanged.

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod/v4'
import { invokeBrowserTool } from './browserTools'

const sessionId = z.string().min(1).describe('Ephemeral browser session id for the current tab.')

type ToolArgs = Record<string, unknown>

async function invoke(toolName: string, session: string, args: ToolArgs = {}) {
  const payload = await invokeBrowserTool({ sessionId: session, toolName, args })

  if (!payload.ok) {
    throw new Error(payload.error)
  }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload.result, null, 2) }],
    structuredContent: payload.result,
  }
}

function createBrowserMcpServer() {
  const server = new McpServer({
    name: 'azent-browser-tools',
    version: '0.2.0',
  })

  server.registerTool(
    'get_page_snapshot',
    {
      description: 'Read the current page title, URL and all section ids, topics and HTML content. Always call this first before making any changes.',
      inputSchema: { sessionId },
    },
    ({ sessionId }) => invoke('get_page_snapshot', sessionId),
  )

  server.registerTool(
    'set_document_title',
    {
      description: 'Set document.title in the current browser tab.',
      inputSchema: { sessionId, title: z.string().min(1) },
    },
    ({ sessionId, title }) => invoke('set_document_title', sessionId, { title }),
  )

  server.registerTool(
    'focus_section',
    {
      description: 'Scroll to a section if not in view, then flash an orange border highlight. Use when the visitor asks about something that maps to an existing section.',
      inputSchema: { sessionId, id: z.string().min(1).describe('Section id from get_page_snapshot.') },
    },
    ({ sessionId, id }) => invoke('focus_section', sessionId, { id }),
  )

  server.registerTool(
    'add_agent_block',
    {
      description: 'Append a new empty block at the end of the page. The topic appears as a <small> label above the content, contextualising what the block responds to. Returns the block id — save it for append_to_block calls.',
      inputSchema: {
        sessionId,
        topic: z.string().min(1).describe('Short label shown as <small>. Explains what this block is responding to, e.g. "Sobre automatización de procesos".'),
      },
    },
    ({ sessionId, topic }) => invoke('add_agent_block', sessionId, { topic }),
  )

  server.registerTool(
    'append_to_block',
    {
      description: 'Append an HTML fragment to a block\'s content. Call multiple times with small chunks — one heading, one paragraph at a time — to create an incremental writing effect visible to the visitor in real time.',
      inputSchema: {
        sessionId,
        id: z.string().min(1).describe('Block id returned by add_agent_block.'),
        html: z.string().min(1).describe('HTML fragment to append. Use Tailwind utility classes. Keep mobile-first responsive design in mind.'),
      },
    },
    ({ sessionId, id, html }) => invoke('append_to_block', sessionId, { id, html }),
  )

  server.registerTool(
    'set_block_html',
    {
      description: 'Replace the full HTML content of a block. Use for editing a previous response or refactoring. Optionally update the topic label.',
      inputSchema: {
        sessionId,
        id: z.string().min(1),
        html: z.string().min(1).describe('Complete new HTML for the block. Use Tailwind utility classes.'),
        topic: z.string().min(1).optional().describe('New topic label. Omit to keep the existing topic.'),
      },
    },
    ({ sessionId, id, html, topic }) => invoke('set_block_html', sessionId, { id, html, ...(topic ? { topic } : {}) }),
  )

  server.registerTool(
    'remove_block',
    {
      description: 'Remove a block by id.',
      inputSchema: { sessionId, id: z.string().min(1) },
    },
    ({ sessionId, id }) => invoke('remove_block', sessionId, { id }),
  )

  return server
}

export async function handleBrowserMcpRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: browserMcpCorsHeaders(),
    })
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  })
  const server = createBrowserMcpServer()

  await server.connect(transport)
  const response = await transport.handleRequest(request)

  for (const [key, value] of Object.entries(browserMcpCorsHeaders())) {
    response.headers.set(key, value)
  }

  return response
}

function browserMcpCorsHeaders() {
  return {
    'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, mcp-protocol-version',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version',
  }
}
```

- [ ] **Step 2: Run the full test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/server/browserMcp.ts
git commit -m "feat: replace MCP server registrations with 7-tool agent set"
```

---

## Task 5: Update AGENTS.md

**Files:**
- Modify: `.codex-browser-agent/AGENTS.md`

- [ ] **Step 1: Replace the "Browser Control via MCP" section**

Replace the entire section starting at line 98 (`## Browser Control via MCP`) through the end of the file (before `## Contact`) with:

```markdown
## Browser Control via MCP

You have access to a set of MCP tools that let you interact with the visitor's browser in real time — reading the current page state and making changes to it as the conversation unfolds.

Every browser tool call must include the exact `sessionId` provided in the user's context.

### Tool Reference

**`get_page_snapshot`** — Returns `{ title, url, sections[] }` where each section includes `{ id, index, theme, tab, topic?, content }`. `content` is the raw HTML currently displayed in that block. Always call this first before making any changes. Use the existing sections as inspiration when creating new ones.

**`focus_section(id)`** — Scrolls to a section if it's not in the viewport, then flashes an orange border. Use when the visitor asks about something that maps to an existing section on the page.

**`set_document_title(title)`** — Updates the browser tab title.

**`add_agent_block(topic)`** — Creates a new empty block at the end of the page. `topic` is a short label that appears as `<small>` above the block content — it contextualises what this block is responding to (e.g. "Sobre automatización de procesos"). Returns `{ id }`. Save this id to pass to `append_to_block`.

**`append_to_block(id, html)`** — Appends an HTML fragment to a block's existing content. Call multiple times with small chunks to build content incrementally.

**`set_block_html(id, html, topic?)`** — Replaces the full HTML content of a block. Pass `topic` to update the label too. Use for editing a previous block or refactoring content.

**`remove_block(id)`** — Deletes a block by id.

### Response Workflow

1. Call `get_page_snapshot` to read the current page state.
2. If the visitor's question relates to an existing section, call `focus_section` to draw their attention to it before or while responding.
3. If new content is needed, call `add_agent_block` with a short `topic` label. Save the returned `id`.
4. Build the block incrementally with `append_to_block`:
   - First call: `<h2>Section title</h2>`
   - Subsequent calls: one paragraph at a time — `<p>First sentence or two.</p>`, `<p>Next thought...</p>`, etc.
   - This creates a live writing effect visible to the visitor.
5. If the visitor revisits a previous topic, prefer updating the relevant block with `set_block_html` rather than creating a new one.
6. If a block has grown very long (roughly 5× the length of the existing static sections), split it: use `set_block_html` to shorten the original and `add_agent_block` for the overflow.

### Content and Style Rules

- Use Tailwind utility classes for all styling inside HTML. Think mobile-first — every block must look good on mobile and desktop.
- The `<h2>` title inside the block should read like a normal landing page section heading, not a chat reply. Example: "Cómo automatizamos el onboarding" not "Respuesta: automatización del onboarding".
- The `topic` label (`<small>`) is brief and natural. It provides conversational context for the visitor. Example: "Sobre automatización de procesos" not "Response to query about automation processes".
- Never use orange for borders or decorative elements — orange is reserved for the system highlight animation.
- Do not modify the static initial sections (the ones already present at page load). Only create and modify your own agent blocks.
```

- [ ] **Step 2: Verify the file looks correct**

```bash
pnpm test
```

Expected: all tests pass (AGENTS.md changes don't affect tests).

- [ ] **Step 3: Commit**

```bash
git add .codex-browser-agent/AGENTS.md
git commit -m "docs: update AGENTS.md with new browser tool set and workflow"
```

---

## Self-Review

**Spec coverage:**
- ✅ `focus_section` (scroll + highlight, by id) — Task 3 + 4
- ✅ `get_page_snapshot` returns HTML content — Task 3 + 4 (no handler change needed, `...section` spread includes `content`)
- ✅ `add_agent_block` with `topic` field — Task 1 + 3 + 4
- ✅ `append_to_block` for incremental building — Task 3 + 4
- ✅ `set_block_html` with optional topic update — Task 3 + 4
- ✅ `remove_block` — Task 3 + 4
- ✅ `topic` rendered as `<small>` in Block — Task 2
- ✅ `id` attribute on `<section>` element — Task 2
- ✅ AGENTS.md updated — Task 5
- ✅ All old tools deleted — replaced entirely in Tasks 3 + 4

**Type consistency:**
- `SectionInput.id?: string` defined in Task 1, used in Task 3 (`addSection({ id: newId, ... })`)
- `SectionInput.topic?: string` defined in Task 1, used in Tasks 3 and 4
- `updateSection(id, updates)` where `updates: Partial<SectionInput>` — consistent throughout
- Tool names in BrowserToolBridge (Task 3) match tool names in browserMcp.ts (Task 4) exactly

**No placeholders:** all steps contain complete code.
