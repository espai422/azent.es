import { createFileRoute } from '@tanstack/react-router'
import { completeBrowserToolCall } from '#/server/browserTools'

export const Route = createFileRoute('/api/browser-tools/result')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
        const callId = typeof body.callId === 'string' ? body.callId.trim() : ''
        const ok = body.ok === true

        if (!sessionId || !callId) {
          return Response.json({ accepted: false, error: 'sessionId and callId are required' }, { status: 400 })
        }

        const accepted = completeBrowserToolCall({
          sessionId,
          callId,
          result: ok
            ? { ok: true, result: body.result }
            : { ok: false, error: typeof body.error === 'string' ? body.error : 'Tool failed' },
        })

        return Response.json({ accepted }, { status: accepted ? 200 : 404 })
      },
    },
  },
})
