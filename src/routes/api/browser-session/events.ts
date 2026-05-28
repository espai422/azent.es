import { createFileRoute } from '@tanstack/react-router'
import { createBrowserSessionStream } from '#/server/browserTools'

export const Route = createFileRoute('/api/browser-session/events')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const sessionId = url.searchParams.get('sessionId')?.trim()

        if (!sessionId) {
          return Response.json({ error: 'sessionId is required' }, { status: 400 })
        }

        return new Response(createBrowserSessionStream(sessionId), {
          headers: {
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'Content-Type': 'text/event-stream',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
