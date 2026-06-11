import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { sendMessage } from '../server/chat'

export const Route = createFileRoute('/chat')({ component: Chat })

type Message = { role: 'user' | 'assistant'; content: string }

function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const data = await sendMessage({ data: { message: text } })
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply ?? 'Error' },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err instanceof Error ? err.message : 'Error' },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-black/45">Escribe un mensaje para empezar.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-black text-white'
                    : 'border border-black text-black'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="border border-black px-4 py-2.5 text-sm text-[#ff4d00]">
                <span className="animate-pulse">···</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-black px-4 py-4">
        <form
          className="mx-auto flex max-w-2xl gap-2"
          onSubmit={(e) => { e.preventDefault(); void send() }}
        >
          <input
            className="flex-1 border border-black px-4 py-2.5 text-sm outline-none focus:border-[#ff4d00]"
            placeholder="Escribe un mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#ff4d00] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
