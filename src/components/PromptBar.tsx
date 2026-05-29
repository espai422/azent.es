import { useEffect, useRef, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { ArrowUp, Check, LoaderCircle, Sparkles, Wrench } from 'lucide-react'

type PromptStatus = 'idle' | 'sending' | 'sent' | 'error'
type Activity = { id: string; label: string; state: 'active' | 'done' | 'error' }

type StreamEvent =
  | { type: 'thread.started'; threadId: string }
  | { type: 'turn.started' }
  | { type: 'message.completed'; text: string }
  | { type: 'reasoning.completed'; text: string }
  | { type: 'tool.started'; id: string; tool: string; args: unknown }
  | { type: 'tool.completed'; id: string; tool: string; result: unknown }
  | { type: 'tool.failed'; id: string; tool: string; error: string }
  | { type: 'error'; message: string }
  | { type: 'turn.completed'; finalResponse: string }

export function PromptBar() {
  const [prompt, setPrompt] = useState('')
  const [lastPrompt, setLastPrompt] = useState('')
  const [status, setStatus] = useState<PromptStatus>('idle')
  const [browserSessionId, setBrowserSessionId] = useState('')
  const [activities, setActivities] = useState<Activity[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSubmit = prompt.trim().length > 0 && status !== 'sending' && browserSessionId.length > 0

  useEffect(() => {
    setBrowserSessionId(window.sessionStorage.getItem('azent.browserSessionId') || '')

    function handleBrowserSession(event: Event) {
      const customEvent = event as CustomEvent<{ sessionId?: string }>
      setBrowserSessionId(customEvent.detail?.sessionId || '')
    }

    window.addEventListener('azent:browser-session', handleBrowserSession)
    return () => window.removeEventListener('azent:browser-session', handleBrowserSession)
  }, [])

  function resizeTextarea() {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 136)}px`
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextPrompt = prompt.trim()
    if (!nextPrompt || status === 'sending') return

    setPrompt('')
    setLastPrompt(nextPrompt)
    setStatus('sending')

    if (textareaRef.current) textareaRef.current.style.height = '0px'
    setActivities([{ id: 'turn', label: 'Preparando turno', state: 'active' }])

    try {
      await streamPrompt(nextPrompt, browserSessionId, setActivities)
      setStatus('sent')
    } catch (error) {
      setStatus('error')
      setPrompt(nextPrompt)
      setActivities((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          label: error instanceof Error ? error.message : 'No se pudo procesar el turno',
          state: 'error',
        },
      ])
    }
  }

  const statusLabel = {
    idle: 'Listo',
    sending: 'Procesando',
    sent: 'Enviado',
    error: 'No enviado',
  }[status]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[2147483647] px-3 pb-3 sm:px-6 sm:pb-5">
      <div className="mx-auto w-full max-w-3xl">
        {lastPrompt && (
          <div className="mb-2 flex flex-col items-center gap-2">
            <div className="pointer-events-auto flex max-w-full items-start gap-2 rounded-2xl border border-white/10 bg-zinc-950/85 px-3 py-2 text-xs leading-5 text-zinc-300 shadow-2xl shadow-black/30 backdrop-blur-xl">
              {status === 'sending' ? (
                <LoaderCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-white" aria-hidden="true" />
              ) : (
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
              )}
              <span className="shrink-0 font-medium text-zinc-100">{statusLabel}</span>
              <span className="mt-1 h-3 w-px shrink-0 bg-white/15" aria-hidden="true" />
              <span className="line-clamp-2 min-w-0 whitespace-pre-wrap break-words sm:line-clamp-3">{lastPrompt}</span>
            </div>
            {activities.length > 0 && (
              <div className="pointer-events-auto flex max-h-36 w-full max-w-2xl flex-col gap-1 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/82 p-2 text-xs text-zinc-300 shadow-2xl shadow-black/30 backdrop-blur-xl">
                {activities.slice(-6).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
                    {activity.state === 'active' && <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-white" aria-hidden="true" />}
                    {activity.state === 'done' && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />}
                    {activity.state === 'error' && <Wrench className="h-3.5 w-3.5 shrink-0 text-red-300" aria-hidden="true" />}
                    <span className="min-w-0 truncate">{activity.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form
          className={`pointer-events-auto rounded-2xl border border-white/12 bg-neutral-950/88 p-1.5 shadow-[0_18px_70px_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:rounded-[1.4rem] sm:p-2 ${status === 'sending' ? 'hidden sm:block' : ''}`}
          autoComplete="off"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="flex items-end gap-1.5 sm:gap-2">
            <textarea
              ref={textareaRef}
              aria-label="Prompt para modificar la web"
              aria-autocomplete="none"
              className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[16px] leading-5 text-white outline-none placeholder:text-zinc-500 sm:min-h-12 sm:px-3 sm:py-3 sm:text-sm sm:leading-6"
              id="azent-prompt-composer"
              name="azent-prompt-composer"
              placeholder="Pide un cambio en la web..."
              rows={1}
              value={prompt}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="none"
              enterKeyHint="send"
              spellCheck={false}
              inputMode="text"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-protonpass-ignore="true"
              data-form-type="other"
              onChange={(event) => {
                setPrompt(event.target.value)
                resizeTextarea()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              disabled={status === 'sending' || !browserSessionId}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-black transition duration-200 hover:scale-[1.03] hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:hover:scale-100 sm:h-12 sm:w-12 sm:rounded-2xl"
              aria-label="Enviar prompt"
              title="Enviar prompt"
            >
              {status === 'sending' ? (
                <LoaderCircle className="h-4 w-4 animate-spin sm:h-5 sm:w-5" aria-hidden="true" />
              ) : (
                <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

async function streamPrompt(
  message: string,
  browserSessionId: string,
  setActivities: Dispatch<SetStateAction<Activity[]>>,
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
      handleStreamEvent(JSON.parse(line) as StreamEvent, setActivities)
    }
  }
}

function handleStreamEvent(
  event: StreamEvent,
  setActivities: Dispatch<SetStateAction<Activity[]>>,
) {
  switch (event.type) {
    case 'thread.started':
      setActivities((prev) => [
        ...prev.map((activity) =>
          activity.id === 'turn' ? { ...activity, state: 'done' as const } : activity,
        ),
        { id: event.threadId, label: `Thread ${event.threadId.slice(0, 8)}`, state: 'done' },
      ])
      break
    case 'turn.started':
      setActivities((prev) => [
        ...prev.map((activity) =>
          activity.id === 'turn' ? { ...activity, state: 'done' as const } : activity,
        ),
        { id: `turn-started-${Date.now()}`, label: 'Codex pensando', state: 'active' },
      ])
      break
    case 'reasoning.completed':
      if (event.text.trim()) {
        setActivities((prev) => [
          ...prev,
          { id: `reasoning-${Date.now()}`, label: event.text.trim(), state: 'done' },
        ])
      }
      break
    case 'message.completed':
      if (event.text.trim()) {
        setActivities((prev) => [
          ...prev,
          { id: `message-${Date.now()}`, label: event.text.trim(), state: 'done' },
        ])
      }
      break
    case 'tool.started':
      setActivities((prev) => [
        ...prev,
        { id: event.id, label: `Ejecutando ${event.tool}`, state: 'active' },
      ])
      break
    case 'tool.completed':
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === event.id
            ? { ...activity, label: `${event.tool} completada`, state: 'done' }
            : activity,
        ),
      )
      break
    case 'tool.failed':
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === event.id
            ? { ...activity, label: `${event.tool}: ${event.error}`, state: 'error' }
            : activity,
        ),
      )
      break
    case 'error':
      setActivities((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, label: event.message, state: 'error' },
      ])
      break
    case 'turn.completed':
      setActivities((prev) => {
        const finalResponse = event.finalResponse.trim()
        const alreadyShown = finalResponse
          ? prev.some((activity) => activity.label === finalResponse)
          : true

        const completedActivities = prev.map((activity) =>
          activity.state === 'active' ? { ...activity, state: 'done' as const } : activity,
        )

        if (alreadyShown) return completedActivities

        return [
          ...completedActivities,
          { id: `complete-${Date.now()}`, label: finalResponse, state: 'done' },
        ]
      })
      break
  }
}
