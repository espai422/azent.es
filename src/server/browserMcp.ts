import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod/v4'
import { invokeBrowserTool } from './browserTools'

const sessionId = z.string().min(1).describe('Ephemeral browser session id for the current tab.')
const html = z.string().min(1).describe('Trusted HTML rendered inside the section.')
const theme = z.enum(['dark-1', 'light-2', 'dark-2', 'light-1', 'closing'])
const tab = z.enum(['center', 'right', 'left', 'none'])

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
    version: '0.1.0',
  })

  server.registerTool(
    'get_page_snapshot',
    {
      description: 'Read the current page title, URL and editable section ids/content.',
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
    'scroll_to_section',
    {
      description: 'Smooth-scroll the browser to a section index.',
      inputSchema: { sessionId, index: z.number().int().min(0) },
    },
    ({ sessionId, index }) => invoke('scroll_to_section', sessionId, { index }),
  )

  server.registerTool(
    'highlight_section',
    {
      description: 'Briefly highlight a section index in the browser.',
      inputSchema: { sessionId, index: z.number().int().min(0) },
    },
    ({ sessionId, index }) => invoke('highlight_section', sessionId, { index }),
  )

  server.registerTool(
    'add_section',
    {
      description: 'Append a new landing-page section.',
      inputSchema: {
        sessionId,
        content: html,
        theme: theme.optional(),
        tab: tab.optional(),
        rule: z.boolean().optional(),
        className: z.string().optional(),
      },
    },
    ({ sessionId, ...section }) => invoke('add_section', sessionId, section),
  )

  server.registerTool(
    'set_section_html',
    {
      description: 'Replace the HTML content of an existing section by id.',
      inputSchema: { sessionId, id: z.string().min(1), content: html },
    },
    ({ sessionId, id, content }) => invoke('set_section_html', sessionId, { id, content }),
  )

  server.registerTool(
    'set_section_theme',
    {
      description: 'Change a section theme and optionally its tab shape.',
      inputSchema: { sessionId, id: z.string().min(1), theme, tab: tab.optional() },
    },
    ({ sessionId, id, theme, tab }) => invoke('set_section_theme', sessionId, { id, theme, tab }),
  )

  server.registerTool(
    'move_section',
    {
      description: 'Move an existing section to another zero-based index.',
      inputSchema: { sessionId, id: z.string().min(1), toIndex: z.number().int().min(0) },
    },
    ({ sessionId, id, toIndex }) => invoke('move_section', sessionId, { id, toIndex }),
  )

  server.registerTool(
    'remove_section',
    {
      description: 'Remove an existing section by id.',
      inputSchema: { sessionId, id: z.string().min(1) },
    },
    ({ sessionId, id }) => invoke('remove_section', sessionId, { id }),
  )

  server.registerTool(
    'replace_all_sections',
    {
      description: 'Replace all landing-page sections in one operation.',
      inputSchema: {
        sessionId,
        sections: z.array(z.object({
          content: html,
          theme: theme.optional(),
          tab: tab.optional(),
          rule: z.boolean().optional(),
          className: z.string().optional(),
        })).min(1),
      },
    },
    ({ sessionId, sections }) => invoke('replace_all_sections', sessionId, { sections }),
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
