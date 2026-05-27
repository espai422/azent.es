import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUp, LoaderCircle, Sparkles } from 'lucide-react'
import { submitPrompt } from '#/server/prompt'

type PromptStatus = 'idle' | 'sending' | 'sent' | 'error'

export function PromptBar() {
  const [prompt, setPrompt] = useState('')
  const [lastPrompt, setLastPrompt] = useState('')
  const [status, setStatus] = useState<PromptStatus>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSubmit = prompt.trim().length > 0 && status !== 'sending'

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

    try {
      await submitPrompt({ data: { prompt: nextPrompt } })
      setStatus('sent')
    } catch {
      setStatus('error')
      setPrompt(nextPrompt)
    }
  }

  const statusLabel = {
    idle: 'Listo',
    sending: 'Procesando',
    sent: 'Enviado',
    error: 'No enviado',
  }[status]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-5">
      <div className="mx-auto w-full max-w-3xl">
        {lastPrompt && (
          <div className="mb-2 flex justify-center">
            <div className="pointer-events-auto flex max-w-full items-start gap-2 rounded-2xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-xs leading-5 text-zinc-300 shadow-2xl shadow-black/30 backdrop-blur-xl">
              {status === 'sending' ? (
                <LoaderCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-white" aria-hidden="true" />
              ) : (
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
              )}
              <span className="shrink-0 font-medium text-zinc-100">{statusLabel}</span>
              <span className="mt-1 h-3 w-px shrink-0 bg-white/15" aria-hidden="true" />
              <span className="line-clamp-2 min-w-0 whitespace-pre-wrap break-words sm:line-clamp-3">{lastPrompt}</span>
            </div>
          </div>
        )}

        <form
          className="pointer-events-auto rounded-[1.4rem] border border-white/12 bg-neutral-950/88 p-2 shadow-[0_18px_70px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
          autoComplete="off"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              aria-label="Prompt para modificar la web"
              aria-autocomplete="none"
              className="min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-[16px] leading-6 text-white outline-none placeholder:text-zinc-500 sm:text-sm"
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
              disabled={status === 'sending'}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-black transition duration-200 hover:scale-[1.03] hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:hover:scale-100"
              aria-label="Enviar prompt"
              title="Enviar prompt"
            >
              {status === 'sending' ? (
                <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUp className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
