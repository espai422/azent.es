import { createFileRoute } from '@tanstack/react-router'
import { Codex, type ThreadEvent } from '@openai/codex-sdk'

const encoder = new TextEncoder()

type ClientStreamEvent =
  | { type: 'thread.started'; threadId: string }
  | { type: 'turn.started' }
  | { type: 'message.completed'; text: string }
  | { type: 'reasoning.completed'; text: string }
  | { type: 'tool.started'; id: string; tool: string; args: unknown }
  | { type: 'tool.completed'; id: string; tool: string; result: unknown }
  | { type: 'tool.failed'; id: string; tool: string; error: string }
  | { type: 'error'; message: string }
  | { type: 'turn.completed'; finalResponse: string }

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

function createCodex(appOrigin: string) {
  return new Codex({
    config: {
      mcp_servers: {
        browser_tools: {
          command: process.execPath,
          args: ['scripts/browser-tools-mcp.mjs'],
          default_tools_approval_mode: 'approve',
          env: {
            AZENT_APP_ORIGIN: appOrigin,
            BROWSER_TOOLS_INTERNAL_TOKEN: process.env.BROWSER_TOOLS_INTERNAL_TOKEN || '',
          },
        },
      },
    },
  })
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

        const thread = createCodex(appOrigin).startThread({
          skipGitRepoCheck: true,
          workingDirectory: process.cwd(),
          approvalPolicy: 'never',
          sandboxMode: 'workspace-write',
        })

        const prompt = [
          `Browser session id: ${browserSessionId}`,
          '',
          'You can control the current web page through the browser_tools MCP server.',
          'Every browser_tools call requires the exact browserSessionId above.',
          'Prefer using get_page_snapshot first, then apply focused changes with the browser tools.',
          'Keep the user updated briefly in Spanish while you work.',
          '',
          `User request: ${message}`,
        ].join('\n')

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let finalResponse = ''

            try {
              const { events } = await thread.runStreamed(prompt)

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
            }
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
