import type { ClientStreamEvent } from '#/shared/chatStream'

export async function streamPrompt(
  message: string,
  browserSessionId: string,
  onEvent: (event: ClientStreamEvent) => void,
) {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, browserSessionId }),
  })

  if (!response.ok || !response.body) {
    const error = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(error?.error || 'No se pudo abrir el stream')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      onEvent(JSON.parse(line) as ClientStreamEvent)
    }
  }
}
