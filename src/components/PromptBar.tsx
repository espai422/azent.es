import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUp, Check, LoaderCircle, Sparkles, Wrench } from 'lucide-react'
import { reduceActivities } from './prompt/activityReducer'
import { streamPrompt } from './prompt/streamClient'
import type { Activity, PromptStatus } from './prompt/types'

export function PromptBar() {
  const [prompt, setPrompt] = useState('')
  const [lastPrompt, setLastPrompt] = useState('')
  const [status, setStatus] = useState<PromptStatus>('idle')
  const [browserSessionId, setBrowserSessionId] = useState('')
  const [activities, setActivities] = useState<Activity[]>([])
  const [hasMounted, setHasMounted] = useState(false)
  const [lockedWidth, setLockedWidth] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const visible = hasMounted && status !== 'sending'
  const canSubmit =
    prompt.trim().length > 0 && status !== 'sending' && browserSessionId.length > 0 && visible

  useEffect(() => {
    setBrowserSessionId(window.sessionStorage.getItem('azent.browserSessionId') || '')

    function handleBrowserSession(event: Event) {
      const customEvent = event as CustomEvent<{ sessionId?: string }>
      setBrowserSessionId(customEvent.detail?.sessionId || '')
    }

    window.addEventListener('azent:browser-session', handleBrowserSession)
    return () => window.removeEventListener('azent:browser-session', handleBrowserSession)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setHasMounted(true), 500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const update = () => setLockedWidth(node.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
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
      await streamPrompt(nextPrompt, browserSessionId, (streamEvent) => {
        setActivities((prev) => reduceActivities(prev, streamEvent))
      })
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
      <div ref={containerRef} className="mx-auto w-full max-w-3xl">
        {lastPrompt && (
          <div className="mb-2 flex flex-col items-center">
            <div className="pointer-events-auto flex max-w-full items-start gap-2 rounded-2xl border border-white/10 bg-zinc-950/85 px-3 py-2 text-xs leading-5 text-zinc-300 shadow-2xl shadow-black/30 backdrop-blur-xl">
              {status === 'sending' ? (
                <LoaderCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-white" aria-hidden="true" />
              ) : (
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
              )}
              <span className="shrink-0 font-medium text-zinc-100">{statusLabel}</span>
              <span className="mt-1 h-3 w-px shrink-0 bg-white/15" aria-hidden="true" />
              <span className="line-clamp-1 min-w-0 whitespace-pre-wrap break-words sm:line-clamp-3">{lastPrompt}</span>
            </div>
          </div>
        )}

        <div
          className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            activities.length > 0
              ? 'mb-2 max-h-20 translate-y-0 opacity-100'
              : 'mb-0 max-h-0 -translate-y-4 opacity-0'
          }`}
        >
          {(() => {
            const last = activities[activities.length - 1]
            if (!last) return null
            return (
              <div
                key={last.id}
                className="pointer-events-auto mx-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/82 px-3 py-2 text-xs text-zinc-300 shadow-2xl shadow-black/30 backdrop-blur-xl"
                style={lockedWidth ? { width: `${lockedWidth}px` } : undefined}
              >
                {last.state === 'active' && <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-white" aria-hidden="true" />}
                {last.state === 'done' && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />}
                {last.state === 'error' && <Wrench className="h-3.5 w-3.5 shrink-0 text-red-300" aria-hidden="true" />}
                <span className="min-w-0 truncate">{last.label}</span>
              </div>
            )
          })()}
        </div>

        <div className="flex justify-center">
          <div
            className="flex justify-center overflow-hidden rounded-2xl sm:rounded-[1.4rem]"
            style={{
              width: visible ? '100%' : '0px',
              transition: 'width 1000ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            aria-hidden={!visible}
            inert={!visible}
          >
            <form
              className="pointer-events-auto shrink-0 rounded-2xl border border-white/12 bg-neutral-950/88 p-1 shadow-[0_18px_70px_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:rounded-[1.4rem] sm:p-2"
              style={lockedWidth ? { width: `${lockedWidth}px` } : undefined}
              autoComplete="off"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <div className="flex items-end gap-1 sm:gap-2">
                <textarea
                  ref={textareaRef}
                  aria-label="Prompt para modificar la web"
                  aria-autocomplete="none"
                  className="min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[16px] leading-5 text-white outline-none placeholder:text-zinc-500 sm:min-h-12 sm:px-3 sm:py-3 sm:text-sm sm:leading-6"
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
                  disabled={status === 'sending' || !browserSessionId || !visible}
                />
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-black transition duration-200 hover:scale-[1.03] hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:hover:scale-100 sm:h-12 sm:w-12 sm:rounded-2xl"
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
      </div>
    </div>
  )
}
