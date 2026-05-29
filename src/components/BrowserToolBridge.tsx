import { useEffect, useMemo, useRef, useState } from 'react'
import { useSections, type SectionInput } from '#/components/sections'
import type { DiagramJSON } from '#/components/sections'
import { createId } from '#/utils/id'
import { diffHtml, stripFlashSpans, wrapAllTextAsFlash } from '#/utils/htmlDiff'

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

function readDiagram(value: unknown): DiagramJSON {
  if (!isObject(value)) throw new Error('diagram must be an object')
  const nodes = Array.isArray(value.nodes) ? value.nodes : null
  const edges = Array.isArray(value.edges) ? value.edges : null
  if (!nodes || !edges) throw new Error('diagram requires nodes[] and edges[]')

  const nodeIds = new Set<string>()
  const normalizedNodes = nodes.map((raw, i) => {
    if (!isObject(raw)) throw new Error(`nodes[${i}] must be an object`)
    const id = readString(raw.id).trim()
    const label = readString(raw.label).trim()
    const x = typeof raw.x === 'number' ? raw.x : NaN
    const y = typeof raw.y === 'number' ? raw.y : NaN
    if (!id) throw new Error(`nodes[${i}].id required`)
    if (!label) throw new Error(`nodes[${i}].label required`)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`nodes[${i}] requires numeric x and y`)
    }
    if (nodeIds.has(id)) throw new Error(`duplicate node id: ${id}`)
    nodeIds.add(id)
    return { id, label, x, y }
  })

  const normalizedEdges = edges.map((raw, i) => {
    if (!isObject(raw)) throw new Error(`edges[${i}] must be an object`)
    const source = readString(raw.source).trim()
    const target = readString(raw.target).trim()
    if (!source || !target) throw new Error(`edges[${i}] requires source and target`)
    if (!nodeIds.has(source)) throw new Error(`edges[${i}].source ${source} not in nodes`)
    if (!nodeIds.has(target)) throw new Error(`edges[${i}].target ${target} not in nodes`)
    const out: { id?: string; source: string; target: string; label?: string; highlight?: boolean } = {
      source,
      target,
    }
    if (typeof raw.id === 'string' && raw.id) out.id = raw.id
    if (typeof raw.label === 'string') out.label = raw.label
    if (raw.highlight === true) out.highlight = true
    return out
  })

  return { nodes: normalizedNodes, edges: normalizedEdges }
}

function readVariables(value: unknown): Record<string, number> {
  if (!isObject(value)) throw new Error('variables must be an object')
  const out: Record<string, number> = {}
  for (const [name, raw] of Object.entries(value)) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new Error(`variables.${name} must be a finite number`)
    }
    out[name] = raw
  }
  return out
}

function readDiagramPosition(value: unknown): 'before' | 'after' {
  const v = readString(value)
  if (v === 'before' || v === 'after') return v
  throw new Error('diagramPosition must be "before" or "after"')
}

function flashBlockOutline(id: string) {
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
}

export function BrowserToolBridge() {
  const { sections, addSection, updateSection, removeSection } = useSections()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sectionsRef = useRef(sections)

  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  const tools = useMemo(() => {
    async function scrollIntoViewIfNeeded(id: string) {
      const element = document.getElementById(id)
      if (!element) return
      const rect = element.getBoundingClientRect()
      const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
      if (isInView) return
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      await new Promise(resolve => setTimeout(resolve, 380))
    }

    return {
    get_page_snapshot: () => ({
      title: document.title,
      url: window.location.href,
      sections: sectionsRef.current.map((section, index) => ({
        index,
        ...section,
        content: stripFlashSpans(section.content),
      })),
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

      const optional: Partial<SectionInput> = {}
      if (args.diagram !== undefined) optional.diagram = readDiagram(args.diagram)
      if (args.diagramPosition !== undefined) {
        optional.diagramPosition = readDiagramPosition(args.diagramPosition)
      }
      if (args.formula !== undefined) {
        const f = readString(args.formula).trim()
        if (!f) throw new Error('formula cannot be empty when provided')
        if (!optional.diagram) {
          throw new Error('formula requires a diagram on the same block')
        }
        optional.formula = f
      }
      if (args.variables !== undefined) optional.variables = readVariables(args.variables)
      if (optional.formula && !optional.variables) {
        throw new Error('variables required when formula is provided')
      }

      const pinnedSection = sectionsRef.current.find(s => s.pinned)
      if (pinnedSection) {
        const pinnedEl = document.getElementById(pinnedSection.id)
        if (pinnedEl) {
          pinnedEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          await new Promise(resolve => setTimeout(resolve, 380))
        }
      } else {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
        await new Promise(resolve => setTimeout(resolve, 380))
      }

      const newId = createId()
      addSection({ id: newId, content: '', topic, className: 'agent-block', ...optional })
      await new Promise<void>(resolve => { requestAnimationFrame(() => { requestAnimationFrame(() => resolve()) }) })
      const element = document.getElementById(newId)
      if (element) {
        element.style.height = '0px'
        element.style.minHeight = '0px'
        element.style.overflow = 'hidden'
        const revealAnim = element.animate(
          [{ height: '0px' }, { height: '280px' }],
          { duration: 350, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
        )
        await revealAnim.finished
        revealAnim.cancel()
        element.style.removeProperty('height')
        element.style.removeProperty('min-height')
        element.style.removeProperty('overflow')
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

    append_to_block: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const html = readString(args.html).trim()
      if (!id || !html) throw new Error('id and html are required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      await scrollIntoViewIfNeeded(id)
      const existing = stripFlashSpans(section.content)
      const appended = wrapAllTextAsFlash(html)
      updateSection(id, { content: existing + appended })
      return { id }
    },

    set_block_html: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const html = readString(args.html).trim()
      if (!id || !html) throw new Error('id and html are required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      await scrollIntoViewIfNeeded(id)
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

    set_block_diagram: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      const diagram = readDiagram(args.diagram)
      const updates: Partial<SectionInput> = { diagram }
      if (args.diagramPosition !== undefined) {
        updates.diagramPosition = readDiagramPosition(args.diagramPosition)
      } else if (!section.diagramPosition) {
        updates.diagramPosition = 'after'
      }
      const element = document.getElementById(id)
      if (element) {
        const rect = element.getBoundingClientRect()
        const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
        if (!isInView) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          await new Promise(resolve => setTimeout(resolve, 380))
        }
      }
      updateSection(id, updates)
      flashBlockOutline(id)
      return { id, updated: true }
    },

    set_block_formula: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      if (!section.diagram) {
        throw new Error(`Block ${id} has no diagram — set_block_diagram first`)
      }
      const formula = readString(args.formula).trim()
      if (!formula) throw new Error('formula is required')
      const variables = readVariables(args.variables)
      const element = document.getElementById(id)
      if (element) {
        const rect = element.getBoundingClientRect()
        const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
        if (!isInView) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          await new Promise(resolve => setTimeout(resolve, 380))
        }
      }
      updateSection(id, { formula, variables })
      flashBlockOutline(id)
      return { id, updated: true }
    },

    clear_block_diagram: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      updateSection(id, {
        diagram: undefined,
        diagramPosition: undefined,
        formula: undefined,
        variables: undefined,
      })
      flashBlockOutline(id)
      return { id, cleared: true }
    },

    clear_block_formula: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      updateSection(id, { formula: undefined, variables: undefined })
      flashBlockOutline(id)
      return { id, cleared: true }
    },
    }
  }, [addSection, removeSection, updateSection])

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
