#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod/v4'

const appOrigin = process.env.AZENT_APP_ORIGIN || 'http://localhost:3000'
const internalToken = process.env.BROWSER_TOOLS_INTERNAL_TOKEN || ''

const server = new McpServer({
  name: 'azent-browser-tools',
  version: '0.1.0',
})

const sessionId = z.string().min(1).describe('Ephemeral browser session id for the current tab.')
const html = z.string().min(1).describe('Trusted HTML rendered inside the section.')
const theme = z.enum(['dark-1', 'light-2', 'dark-2', 'light-1', 'closing'])
const tab = z.enum(['center', 'right', 'left', 'none'])

async function invoke(toolName, session, args = {}) {
  const response = await fetch(new URL('/api/browser-tools/invoke', appOrigin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(internalToken ? { 'x-browser-tools-token': internalToken } : {}),
    },
    body: JSON.stringify({ sessionId: session, toolName, args }),
  })

  const payload = await response.json()
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Browser tool failed: ${toolName}`)
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(payload.result, null, 2) }],
    structuredContent: payload.result,
  }
}

function registerBrowserTool(name, description, inputSchema, handler) {
  server.registerTool(name, { description, inputSchema }, handler)
}

registerBrowserTool(
  'get_page_snapshot',
  'Read the current page title, URL and editable section ids/content.',
  { sessionId },
  ({ sessionId }) => invoke('get_page_snapshot', sessionId),
)

registerBrowserTool(
  'set_document_title',
  'Set document.title in the current browser tab.',
  { sessionId, title: z.string().min(1) },
  ({ sessionId, title }) => invoke('set_document_title', sessionId, { title }),
)

registerBrowserTool(
  'scroll_to_section',
  'Smooth-scroll the browser to a section index.',
  { sessionId, index: z.number().int().min(0) },
  ({ sessionId, index }) => invoke('scroll_to_section', sessionId, { index }),
)

registerBrowserTool(
  'highlight_section',
  'Briefly highlight a section index in the browser.',
  { sessionId, index: z.number().int().min(0) },
  ({ sessionId, index }) => invoke('highlight_section', sessionId, { index }),
)

registerBrowserTool(
  'add_section',
  'Append a new landing-page section.',
  {
    sessionId,
    content: html,
    theme: theme.optional(),
    tab: tab.optional(),
    rule: z.boolean().optional(),
    className: z.string().optional(),
  },
  ({ sessionId, ...section }) => invoke('add_section', sessionId, section),
)

registerBrowserTool(
  'set_section_html',
  'Replace the HTML content of an existing section by id.',
  { sessionId, id: z.string().min(1), content: html },
  ({ sessionId, id, content }) => invoke('set_section_html', sessionId, { id, content }),
)

registerBrowserTool(
  'set_section_theme',
  'Change a section theme and optionally its tab shape.',
  { sessionId, id: z.string().min(1), theme, tab: tab.optional() },
  ({ sessionId, id, theme, tab }) => invoke('set_section_theme', sessionId, { id, theme, tab }),
)

registerBrowserTool(
  'move_section',
  'Move an existing section to another zero-based index.',
  { sessionId, id: z.string().min(1), toIndex: z.number().int().min(0) },
  ({ sessionId, id, toIndex }) => invoke('move_section', sessionId, { id, toIndex }),
)

registerBrowserTool(
  'remove_section',
  'Remove an existing section by id.',
  { sessionId, id: z.string().min(1) },
  ({ sessionId, id }) => invoke('remove_section', sessionId, { id }),
)

registerBrowserTool(
  'replace_all_sections',
  'Replace all landing-page sections in one operation.',
  {
    sessionId,
    sections: z.array(z.object({
      content: html,
      theme: theme.optional(),
      tab: tab.optional(),
      rule: z.boolean().optional(),
      className: z.string().optional(),
    })).min(1),
  },
  ({ sessionId, sections }) => invoke('replace_all_sections', sessionId, { sections }),
)

const transport = new StdioServerTransport()
await server.connect(transport)
