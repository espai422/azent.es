import { createFileRoute } from '@tanstack/react-router'
import { invokeBrowserTool } from '#/server/browserTools'

export const Route = createFileRoute('/api/browser-tools/invoke')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedToken = process.env.BROWSER_TOOLS_INTERNAL_TOKEN
        const receivedToken = request.headers.get('x-browser-tools-token')

        if (expectedToken && receivedToken !== expectedToken) {
          return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
        const toolName = typeof body.toolName === 'string' ? body.toolName.trim() : ''

        if (!sessionId || !toolName) {
          return Response.json(
            { ok: false, error: 'sessionId and toolName are required' },
            { status: 400 },
          )
        }

        const result = await invokeBrowserTool({
          sessionId,
          toolName,
          args: body.args,
        })

        return Response.json(result, { status: result.ok ? 200 : 502 })
      },
    },
  },
})
