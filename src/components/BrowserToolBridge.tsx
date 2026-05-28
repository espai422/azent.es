import { useEffect, useMemo, useRef, useState } from 'react'
import { useSections, type SectionInput, type SectionTheme, type TabVariant } from '#/components/sections'

type BrowserToolEvent =
  | { type: 'session.ready'; sessionId: string }
  | { type: 'heartbeat'; now: number }
  | { type: 'tool.call'; callId: string; toolName: string; args: unknown }

type ToolResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: string }

const SESSION_STORAGE_KEY = 'azent.browserSessionId'
const SECTION_THEMES: SectionTheme[] = ['dark-1', 'light-2', 'dark-2', 'light-1', 'closing']
const TAB_VARIANTS: TabVariant[] = ['center', 'right', 'left', 'none']

function getSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const next = window.crypto.randomUUID()
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next)
  return next
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function readTheme(value: unknown) {
  return SECTION_THEMES.includes(value as SectionTheme) ? value as SectionTheme : undefined
}

function readTab(value: unknown) {
  return TAB_VARIANTS.includes(value as TabVariant) ? value as TabVariant : undefined
}

function readSectionInput(value: unknown): SectionInput {
  if (!isObject(value)) throw new Error('Expected section object')

  const content = readString(value.content).trim()
  if (!content) throw new Error('Section content is required')

  return {
    content,
    theme: readTheme(value.theme),
    tab: readTab(value.tab),
    rule: readBoolean(value.rule),
    className: readString(value.className) || undefined,
  }
}

export function BrowserToolBridge() {
  const { sections, addSection, updateSection, removeSection, moveSection, resetSections } = useSections()
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

    scroll_to_section: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const index = Number(args.index)
      const section = document.querySelectorAll<HTMLElement>('.block-section')[index]
      if (!section) throw new Error(`Section not found at index ${index}`)
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return { index }
    },

    highlight_section: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const index = Number(args.index)
      const section = document.querySelectorAll<HTMLElement>('.block-section')[index]
      if (!section) throw new Error(`Section not found at index ${index}`)
      section.animate(
        [
          { outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
          { outlineColor: 'rgba(255,107,43,0.9)', outlineOffset: '-10px' },
          { outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
        ],
        { duration: 1_200, easing: 'ease-out' },
      )
      return { index }
    },

    add_section: (args: unknown) => {
      const input = readSectionInput(args)
      addSection(input)
      return { added: true }
    },

    set_section_html: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const content = readString(args.content).trim()
      if (!id || !content) throw new Error('id and content are required')
      updateSection(id, { content })
      return { id, updated: true }
    },

    set_section_theme: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const theme = readTheme(args.theme)
      const tab = readTab(args.tab)
      if (!id || !theme) throw new Error('id and valid theme are required')
      updateSection(id, { theme, tab })
      return { id, theme, tab }
    },

    move_section: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const toIndex = Number(args.toIndex)
      if (!id || !Number.isInteger(toIndex)) throw new Error('id and integer toIndex are required')
      moveSection(id, toIndex)
      return { id, toIndex }
    },

    remove_section: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      if (!id) throw new Error('id is required')
      removeSection(id)
      return { id, removed: true }
    },

    replace_all_sections: (args: unknown) => {
      if (!isObject(args) || !Array.isArray(args.sections)) {
        throw new Error('sections array is required')
      }
      const nextSections = args.sections.map(readSectionInput)
      resetSections(nextSections)
      return { count: nextSections.length }
    },
  }), [addSection, moveSection, removeSection, resetSections, updateSection])

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
