import { createFileRoute } from '@tanstack/react-router'
import { prewarmThreadForBrowserSession } from '#/server/codex'

export const Route = createFileRoute('/api/chat/init')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        const browserSessionId =
          typeof body.browserSessionId === 'string' ? body.browserSessionId.trim() : ''
        const snapshot = body.snapshot

        if (!browserSessionId) {
          return Response.json({ error: 'browserSessionId is required' }, { status: 400 })
        }

        if (snapshot === undefined || snapshot === null) {
          return Response.json({ error: 'snapshot is required' }, { status: 400 })
        }

        const appOrigin =
          process.env.AZENT_APP_ORIGIN ||
          `${new URL(request.url).protocol}//${request.headers.get('host')}`

        prewarmThreadForBrowserSession(browserSessionId, appOrigin, snapshot)

        return Response.json({ accepted: true })
      },
    },
  },
})
