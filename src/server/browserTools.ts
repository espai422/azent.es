type BrowserEvent =
  | {
      type: 'session.ready'
      sessionId: string
    }
  | {
      type: 'tool.call'
      callId: string
      toolName: string
      args: unknown
    }
  | {
      type: 'heartbeat'
      now: number
    }

type ToolResult =
  | { ok: true; result: unknown }
  | { ok: false; error: string }

type Session = {
  controller: ReadableStreamDefaultController<Uint8Array>
  close: () => void
}

type PendingCall = {
  sessionId: string
  timeout: ReturnType<typeof setTimeout>
  resolve: (result: ToolResult) => void
}

const encoder = new TextEncoder()
const sessions = new Map<string, Session>()
const pendingCalls = new Map<string, PendingCall>()

function writeSse(controller: ReadableStreamDefaultController<Uint8Array>, event: BrowserEvent) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
}

export function createBrowserSessionStream(sessionId: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const existing = sessions.get(sessionId)
      existing?.close()

      const heartbeat = setInterval(() => {
        writeSse(controller, { type: 'heartbeat', now: Date.now() })
      }, 20_000)

      const close = () => {
        clearInterval(heartbeat)
        sessions.delete(sessionId)
        try {
          controller.close()
        } catch {
          // The client may already have disconnected.
        }
      }

      sessions.set(sessionId, { controller, close })
      writeSse(controller, { type: 'session.ready', sessionId })
    },
    cancel() {
      sessions.delete(sessionId)
    },
  })
}

export async function invokeBrowserTool({
  sessionId,
  toolName,
  args,
}: {
  sessionId: string
  toolName: string
  args: unknown
}): Promise<ToolResult> {
  const session = sessions.get(sessionId)
  if (!session) {
    return { ok: false, error: `No browser session connected for ${sessionId}` }
  }

  const callId = crypto.randomUUID()

  const result = await new Promise<ToolResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingCalls.delete(callId)
      resolve({ ok: false, error: `Tool call timed out: ${toolName}` })
    }, 30_000)

    pendingCalls.set(callId, { sessionId, timeout, resolve })
    writeSse(session.controller, { type: 'tool.call', callId, toolName, args })
  })

  return result
}

export function completeBrowserToolCall({
  sessionId,
  callId,
  result,
}: {
  sessionId: string
  callId: string
  result: ToolResult
}): boolean {
  const pending = pendingCalls.get(callId)
  if (!pending || pending.sessionId !== sessionId) return false

  clearTimeout(pending.timeout)
  pendingCalls.delete(callId)
  pending.resolve(result)
  return true
}

export function getBrowserSessionCount() {
  return sessions.size
}
