import { createFileRoute } from '@tanstack/react-router'
import { handleBrowserMcpRequest } from '#/server/browserMcp'

export const Route = createFileRoute('/api/mcp/browser-tools')({
  server: {
    handlers: {
      DELETE: async ({ request }) => handleBrowserMcpRequest(request),
      GET: async ({ request }) => handleBrowserMcpRequest(request),
      OPTIONS: async ({ request }) => handleBrowserMcpRequest(request),
      POST: async ({ request }) => handleBrowserMcpRequest(request),
    },
  },
})
