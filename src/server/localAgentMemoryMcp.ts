import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod/v4'
import {
  appendAgentInstructionSection,
  deleteExample,
  getExamples,
  isLocalAgentMemoryEnabled,
  listExampleSummaries,
  readAgentInstructions,
  replaceAgentInstructionSection,
  upsertExample,
} from './localAgentMemory'

const stringListSchema = z.array(z.string().trim().min(1)).min(1)

const diagramSchema = z.object({
  nodes: z.array(z.object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    x: z.number().finite(),
    y: z.number().finite(),
  })),
  edges: z.array(z.object({
    id: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1),
    target: z.string().trim().min(1),
    label: z.string().optional(),
    highlight: z.boolean().optional(),
  })),
})

const exampleInputSchema = {
  id: z.string().trim().min(1).describe('Stable example id, e.g. "erp-onboarding-flow".'),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).describe('One-line semantic-search summary. No line breaks.'),
  categories: stringListSchema.describe('High-level categories for retrieval.'),
  tags: stringListSchema.describe('Specific reusable visual/content tags.'),
  useCases: stringListSchema.describe('Situations where this example is useful.'),
  audience: z.string().trim().min(1).optional(),
  triggerPhrases: z.array(z.string().trim().min(1)).optional(),
  reusablePatterns: z.array(z.string().trim().min(1)).optional(),
  html: z.string().trim().min(1).describe('Reusable HTML for an AZENT block.'),
  diagram: diagramSchema.optional(),
  formula: z.string().trim().min(1).optional(),
  variables: z.record(z.string().trim().min(1), z.number().finite()).optional(),
  notes: z.string().trim().min(1).optional(),
}

function toolResult(result: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  }
}

function createLocalAgentMemoryMcpServer() {
  const server = new McpServer({
    name: 'azent-local-agent-memory',
    version: '0.1.0',
  })

  server.registerTool(
    'read_agent_instructions',
    {
      description: 'Read .codex-browser-agent/AGENTS.md. Use when you need the current local agent instructions before editing them.',
      inputSchema: {},
    },
    async () => toolResult({ markdown: await readAgentInstructions() }),
  )

  server.registerTool(
    'replace_agent_instruction_section',
    {
      description: 'Replace an existing markdown section in .codex-browser-agent/AGENTS.md. Only use after an explicit user request to edit local agent instructions.',
      inputSchema: {
        heading: z.string().trim().min(1).describe('Exact markdown heading to replace, including # characters.'),
        markdown: z.string().trim().min(1).describe('New body for that section, without the heading line.'),
      },
    },
    async ({ heading, markdown }) => toolResult(await replaceAgentInstructionSection({ heading, markdown })),
  )

  server.registerTool(
    'append_agent_instruction_section',
    {
      description: 'Insert a new markdown section after an existing heading in .codex-browser-agent/AGENTS.md. Only use after an explicit user request to edit local agent instructions.',
      inputSchema: {
        afterHeading: z.string().trim().min(1).describe('Exact existing markdown heading after which the new section should be inserted.'),
        heading: z.string().trim().min(1).describe('New markdown heading, including # characters.'),
        markdown: z.string().trim().min(1).describe('New section body, without the heading line.'),
      },
    },
    async ({ afterHeading, heading, markdown }) =>
      toolResult(await appendAgentInstructionSection({ afterHeading, heading, markdown })),
  )

  server.registerTool(
    'list_example_summaries',
    {
      description: 'List local reusable examples with only compact retrieval metadata: id, title, description, categories, tags and useCases.',
      inputSchema: {},
    },
    async () => toolResult({ examples: await listExampleSummaries() }),
  )

  server.registerTool(
    'get_examples',
    {
      description: 'Fetch full local examples by id after list_example_summaries indicates they may be relevant.',
      inputSchema: {
        ids: z.array(z.string().trim().min(1)).min(1),
      },
    },
    async ({ ids }) => toolResult({ examples: await getExamples(ids) }),
  )

  server.registerTool(
    'upsert_example',
    {
      description: 'Create or edit a local reusable example. Only use after an explicit user request to save or edit an example.',
      inputSchema: exampleInputSchema,
    },
    async (example) => toolResult(await upsertExample(example)),
  )

  server.registerTool(
    'delete_example',
    {
      description: 'Delete a local reusable example by id. Only use after an explicit user request to delete an example.',
      inputSchema: {
        id: z.string().trim().min(1),
      },
    },
    async ({ id }) => toolResult(await deleteExample(id)),
  )

  return server
}

export async function handleLocalAgentMemoryMcpRequest(
  request: Request,
  enabled = isLocalAgentMemoryEnabled(),
): Promise<Response> {
  if (!enabled) {
    return Response.json({ error: 'local_agent_memory is only available during pnpm dev' }, { status: 404 })
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: localAgentMemoryMcpCorsHeaders(),
    })
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  })
  const server = createLocalAgentMemoryMcpServer()

  await server.connect(transport)
  const response = await transport.handleRequest(request)

  for (const [key, value] of Object.entries(localAgentMemoryMcpCorsHeaders())) {
    response.headers.set(key, value)
  }

  return response
}

function localAgentMemoryMcpCorsHeaders() {
  return {
    'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, mcp-protocol-version',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version',
  }
}
