import { createFileRoute } from '@tanstack/react-router'
import { handleLocalAgentMemoryMcpRequest } from '#/server/localAgentMemoryMcp'

export const Route = createFileRoute('/api/mcp/local-agent-memory')({
  server: {
    handlers: {
      DELETE: async ({ request }) => handleLocalAgentMemoryMcpRequest(request),
      GET: async ({ request }) => handleLocalAgentMemoryMcpRequest(request),
      OPTIONS: async ({ request }) => handleLocalAgentMemoryMcpRequest(request),
      POST: async ({ request }) => handleLocalAgentMemoryMcpRequest(request),
    },
  },
})
