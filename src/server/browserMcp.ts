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
      description: 'Append an HTML fragment to a block\'s content. Automatically scrolls the block into view if it is not visible — no need to call focus_section first. Call multiple times with small chunks — one heading, one paragraph at a time — to create an incremental writing effect visible to the visitor in real time.',
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
      description: 'Replace the full HTML content of a block. Automatically scrolls the block into view if it is not visible — no need to call focus_section first. Use for editing a previous response or refactoring. Optionally update the topic label.',
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
