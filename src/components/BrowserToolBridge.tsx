import { useEffect, useMemo, useRef, useState } from 'react'
import { useSections, type SectionInput } from '#/components/sections'
import { createId } from '#/utils/id'
import { diffHtml } from '#/utils/htmlDiff'

type BrowserToolEvent =
  | { type: 'session.ready'; sessionId: string }
  | { type: 'heartbeat'; now: number }
  | { type: 'tool.call'; callId: string; toolName: string; args: unknown }

type ToolResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: string }

const SESSION_STORAGE_KEY = 'azent.browserSessionId'

function getSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const next = createId()
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next)
  return next
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function BrowserToolBridge() {
  const { sections, addSection, updateSection, removeSection } = useSections()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sectionsRef = useRef(sections)

  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  const tools = useMemo(() => ({
    get_page_snapshot: () => ({
      title: document.title,
      url: window.location.href,
      sections: sectionsRef.current.map((section, index) => ({ index, ...section })),
    }),

    set_document_title: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const title = readString(args.title).trim()
      if (!title) throw new Error('title is required')
      document.title = title
      return { title }
    },

    focus_section: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      if (!id) throw new Error('id is required')
      const element = document.getElementById(id)
      if (!element) throw new Error(`Section not found: ${id}`)
      const rect = element.getBoundingClientRect()
      const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
      if (!isInView) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      element.animate(
        [
          { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
          { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0.9)', outlineOffset: '-10px' },
          { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
        ],
        { duration: 1_200, easing: 'ease-out' },
      )
      return { id }
    },

    add_agent_block: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const topic = readString(args.topic).trim()
      if (!topic) throw new Error('topic is required')
      const newId = createId()
      addSection({ id: newId, content: '', topic, className: 'agent-block' })
      // Wait for React to commit the new element to the DOM
      await new Promise<void>(resolve => { requestAnimationFrame(() => { requestAnimationFrame(() => resolve()) }) })
      const element = document.getElementById(newId)
      if (element) {
        // Collapse to zero so the block emerges from below the previous section
        element.style.height = '0px'
        element.style.minHeight = '0px'
        element.style.overflow = 'hidden'
        // Scroll to page bottom where the new block will appear
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
        await new Promise(resolve => setTimeout(resolve, 380))
        // Stretch downward from the previous block
        const revealAnim = element.animate(
          [{ height: '0px' }, { height: '280px' }],
          { duration: 350, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
        )
        await revealAnim.finished
        revealAnim.cancel()
        element.style.removeProperty('height')
        element.style.removeProperty('min-height')
        element.style.removeProperty('overflow')
        // Orange outline flash to signal the block is ready for content
        element.animate(
          [
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0.9)', outlineOffset: '-10px' },
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
          ],
          { duration: 300, easing: 'ease-out' },
        )
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      return { id: newId }
    },

    append_to_block: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const html = readString(args.html).trim()
      if (!id || !html) throw new Error('id and html are required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      updateSection(id, { content: section.content + html })
      // Flash the last child element to highlight newly added content (fire-and-forget)
      setTimeout(() => {
        const contentEl = document.getElementById(id)?.querySelector('.block-content')
        if (contentEl?.lastElementChild) {
          ;(contentEl.lastElementChild as HTMLElement).animate(
            [{ backgroundColor: 'rgba(255,107,43,0.15)' }, { backgroundColor: 'transparent' }],
            { duration: 350, easing: 'ease-out' },
          )
        }
      }, 0)
      return { id }
    },

    set_block_html: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const html = readString(args.html).trim()
      if (!id || !html) throw new Error('id and html are required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      const annotated = diffHtml(section.content, html)
      const updates: Partial<SectionInput> = { content: annotated }
      if (typeof args.topic === 'string' && args.topic.trim()) {
        updates.topic = args.topic.trim()
      }
      updateSection(id, updates)
      // Flash the section outline to indicate content was replaced (fire-and-forget)
      setTimeout(() => {
        document.getElementById(id)?.animate(
          [
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0.7)', outlineOffset: '-8px' },
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
          ],
          { duration: 400, easing: 'ease-out' },
        )
      }, 0)
      return { id, updated: true }
    },

    remove_block: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      if (!id) throw new Error('id is required')
      if (!sectionsRef.current.find(s => s.id === id)) throw new Error(`Section not found: ${id}`)
      removeSection(id)
      return { id, removed: true }
    },
  }), [addSection, removeSection, updateSection])

  useEffect(() => {
    const nextSessionId = getSessionId()
    setSessionId(nextSessionId)

    window.dispatchEvent(new CustomEvent('azent:browser-session', { detail: { sessionId: nextSessionId } }))

    const source = new EventSource(`/api/browser-session/events?sessionId=${encodeURIComponent(nextSessionId)}`)

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as BrowserToolEvent
      if (payload.type !== 'tool.call') return

      void (async () => {
        const tool = tools[payload.toolName as keyof typeof tools]
        let response: ToolResponse

        try {
          response = tool
            ? { ok: true, result: await tool(payload.args) }
            : { ok: false, error: `Unknown browser tool: ${payload.toolName}` }
        } catch (error) {
          response = {
            ok: false,
            error: error instanceof Error ? error.message : 'Browser tool failed',
          }
        }

        await fetch('/api/browser-tools/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: nextSessionId,
            callId: payload.callId,
            ...response,
          }),
        })
      })()
    }

    return () => source.close()
  }, [tools])

  return (
    <div
      data-browser-session-id={sessionId || undefined}
      hidden
      title={sessionId || undefined}
    />
  )
}
