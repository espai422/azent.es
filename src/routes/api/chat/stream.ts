import { createFileRoute } from '@tanstack/react-router'
import type { ThreadEvent } from '@openai/codex-sdk'
import { getThreadForBrowserSession, setBrowserSessionActiveTurn } from '#/server/codex'
import type { ClientStreamEvent } from '#/shared/chatStream'

const encoder = new TextEncoder()

function encodeEvent(event: ClientStreamEvent) {
  return encoder.encode(`${JSON.stringify(event)}\n`)
}

function mapCodexEvent(event: ThreadEvent): ClientStreamEvent | null {
  switch (event.type) {
    case 'thread.started':
      return { type: 'thread.started', threadId: event.thread_id }
    case 'turn.started':
      return { type: 'turn.started' }
    case 'item.started':
      if (event.item.type === 'mcp_tool_call') {
        return {
          type: 'tool.started',
          id: event.item.id,
          tool: event.item.tool,
          args: event.item.arguments,
        }
      }
      return null
    case 'item.completed':
      if (event.item.type === 'agent_message') {
        return { type: 'message.completed', text: event.item.text }
      }
      if (event.item.type === 'reasoning') {
        return { type: 'reasoning.completed', text: event.item.text }
      }
      if (event.item.type === 'mcp_tool_call') {
        if (event.item.status === 'failed') {
          return {
            type: 'tool.failed',
            id: event.item.id,
            tool: event.item.tool,
            error: event.item.error?.message || 'Tool failed',
          }
        }
        return {
          type: 'tool.completed',
          id: event.item.id,
          tool: event.item.tool,
          result: event.item.result?.structured_content ?? event.item.result?.content ?? null,
        }
      }
      return null
    case 'turn.failed':
      return { type: 'error', message: event.error.message }
    case 'error':
      return { type: 'error', message: event.message }
    default:
      return null
  }
}

export const Route = createFileRoute('/api/chat/stream')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        const message = typeof body.message === 'string' ? body.message.trim() : ''
        const browserSessionId =
          typeof body.browserSessionId === 'string' ? body.browserSessionId.trim() : ''

        if (!message) {
          return Response.json({ error: 'message is required' }, { status: 400 })
        }

        if (!browserSessionId) {
          return Response.json({ error: 'browserSessionId is required' }, { status: 400 })
        }

        const appOrigin =
          process.env.AZENT_APP_ORIGIN ||
          `${new URL(request.url).protocol}//${request.headers.get('host')}`

        const sessionThread = getThreadForBrowserSession(browserSessionId, appOrigin)

        if (sessionThread.prewarmTurn) {
          try {
            await sessionThread.prewarmTurn
          } catch {
            // prewarm errors are logged in codex.ts; fall through and let the user turn run.
          }
        }

        if (sessionThread.activeTurn) {
          return Response.json(
            { error: 'This browser session already has an active Codex turn' },
            { status: 409 },
          )
        }

        const prompt = [
          `Browser session id: ${browserSessionId}`,
          '',
          'You can control the current web page through the browser_tools MCP server.',
          'Every browser_tools call requires the exact browserSessionId above.',
          'In local development, you may also have a local_agent_memory MCP server. Use it to read reusable example summaries when the visitor asks for examples, visual compositions, HTML blocks, diagrams, or similar content. Fetch full examples only when their summaries look relevant.',
          'Only create, edit, or delete local_agent_memory examples or AGENTS.md instructions when the user explicitly asks you to save, update, delete, or remember something. Do not write memory proactively.',
          'You already received the initial page snapshot at the start of this thread — rely on it as your mental model. Call get_page_snapshot only if you need to confirm the current state.',
          'Visual identity: the site is flat brutalist with exactly three inks — black, white, and vivid orange (#ff4d00). Blocks cycle automatically through solid black, solid white, and solid orange backgrounds; text colors adapt via CSS variables, so never hardcode text or background colors and never use grays, gradients, blur, rounded corners, or soft shadows in generated HTML. Depth is expressed with 1px solid borders and hard offset shadows, which the site primitives already provide.',
          'When generating HTML, prefer the site visual primitives over ad-hoc panels: use reflect-grid for a responsive panel grid, reflect-grid--three for three columns, reflect-panel for flat bordered panels with a hard-shadow hover, edge-panel for a thick left-accent callout, corner-frame to add a small accent corner square, signal-list for compact stacked items that invert color on hover, block-cards/block-card/block-stat for metric cards (stats render big in accent color), accent for accent-colored emphasis (orange on black/white blocks, white on orange blocks), and outcome-note for an important left-rule note. Labels and small headings look best in the mono font: use class font-mono with uppercase and tracking-wider. Keep typography consistent with the site; never use serif fonts.',
          'Diagramas: constrúyelos de forma incremental, llamando set_block_diagram varias veces con uno o dos nodos/aristas más en cada llamada. Mantén los id estables entre llamadas para que la UI anime las transiciones (entrada, movimiento, eliminación, cambio de label). Reordena posiciones cuando añadas nodos para mantener el layout equilibrado.',
          'Keep the user updated briefly in Spanish while you work.',
          '',
          `User request: ${message}`,
        ].join('\n')

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let finalResponse = ''

            const activeTurn = (async () => {
              try {
                const { events } = await sessionThread.thread.runStreamed(prompt)

                for await (const event of events) {
                  if (event.type === 'item.completed' && event.item.type === 'agent_message') {
                    finalResponse = event.item.text
                  }

                  const mapped = mapCodexEvent(event)
                  if (mapped) controller.enqueue(encodeEvent(mapped))
                }

                controller.enqueue(encodeEvent({ type: 'turn.completed', finalResponse }))
                controller.close()
              } catch (error) {
                controller.enqueue(encodeEvent({
                  type: 'error',
                  message: error instanceof Error ? error.message : 'Codex stream failed',
                }))
                controller.close()
              } finally {
                setBrowserSessionActiveTurn(browserSessionId, null)
              }
            })()

            setBrowserSessionActiveTurn(browserSessionId, activeTurn)
          },
        })

        return new Response(stream, {
          headers: {
            'Cache-Control': 'no-cache, no-transform',
            'Content-Type': 'application/x-ndjson',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
