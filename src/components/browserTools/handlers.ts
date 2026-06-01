import type { MutableRefObject } from 'react'
import type { SectionConfig, SectionInput } from '#/components/sections'
import { createId } from '#/utils/id'
import { diffHtml, stripFlashSpans, wrapAllTextAsFlash } from '#/utils/htmlDiff'
import { engageStreamingAutoscroll } from '#/utils/streamingAutoscroll'
import {
  flashBlockById,
  flashReplacementById,
  focusAndFlashElement,
  focusBlockIfNeeded,
  revealInsertedBlock,
  scrollToPinnedBoundary,
  waitForNextPaint,
} from './domEffects'
import { createPageSnapshot } from './snapshot'
import type { BrowserToolHandlers } from './types'
import {
  isObject,
  readDiagram,
  readDiagramPosition,
  readString,
  readVariables,
} from './validators'

type BrowserToolHandlerDeps = {
  sectionsRef: MutableRefObject<SectionConfig[]>
  lastTouchedIdRef: MutableRefObject<string | null>
  addSection: (input: SectionInput) => void
  updateSection: (id: string, input: Partial<SectionInput>) => void
  removeSection: (id: string) => void
}

export function createBrowserToolHandlers({
  sectionsRef,
  lastTouchedIdRef,
  addSection,
  updateSection,
  removeSection,
}: BrowserToolHandlerDeps): BrowserToolHandlers {
  const focusCurrentBlockIfNeeded = (id: string) =>
    focusBlockIfNeeded(id, lastTouchedIdRef.current)

  return {
    get_page_snapshot: () => createPageSnapshot({
      title: document.title,
      url: window.location.href,
      sections: sectionsRef.current,
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
      focusAndFlashElement(element)
      lastTouchedIdRef.current = id
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

      const pinnedSection = sectionsRef.current.find((section) => section.pinned)
      await scrollToPinnedBoundary(pinnedSection?.id)

      const newId = createId()
      addSection({ id: newId, content: '', topic, className: 'agent-block', ...optional })
      await waitForNextPaint()

      await revealInsertedBlock(newId)
      lastTouchedIdRef.current = newId
      engageStreamingAutoscroll(newId)
      return { id: newId }
    },

    append_to_block: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const html = readString(args.html).trim()
      if (!id || !html) throw new Error('id and html are required')
      const section = sectionsRef.current.find((s) => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      await focusCurrentBlockIfNeeded(id)
      const existing = stripFlashSpans(section.content)
      const appended = wrapAllTextAsFlash(html)
      updateSection(id, { content: existing + appended })
      lastTouchedIdRef.current = id
      engageStreamingAutoscroll(id)
      return { id }
    },

    set_block_html: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const html = readString(args.html).trim()
      if (!id || !html) throw new Error('id and html are required')
      const section = sectionsRef.current.find((s) => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      await focusCurrentBlockIfNeeded(id)
      const annotated = diffHtml(section.content, html)
      const updates: Partial<SectionInput> = { content: annotated }
      if (typeof args.topic === 'string' && args.topic.trim()) {
        updates.topic = args.topic.trim()
      }
      updateSection(id, updates)
      flashReplacementById(id)
      lastTouchedIdRef.current = id
      engageStreamingAutoscroll(id)
      return { id, updated: true }
    },

    remove_block: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      if (!id) throw new Error('id is required')
      if (!sectionsRef.current.find((s) => s.id === id)) throw new Error(`Section not found: ${id}`)
      removeSection(id)
      if (lastTouchedIdRef.current === id) lastTouchedIdRef.current = null
      return { id, removed: true }
    },

    set_block_diagram: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find((s) => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      const diagram = readDiagram(args.diagram)
      const updates: Partial<SectionInput> = { diagram }
      if (args.diagramPosition !== undefined) {
        updates.diagramPosition = readDiagramPosition(args.diagramPosition)
      } else if (!section.diagramPosition) {
        updates.diagramPosition = 'after'
      }
      await focusCurrentBlockIfNeeded(id)
      updateSection(id, updates)
      flashBlockById(id)
      lastTouchedIdRef.current = id
      engageStreamingAutoscroll(id)
      return { id, updated: true }
    },

    set_block_formula: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find((s) => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      if (!section.diagram) {
        throw new Error(`Block ${id} has no diagram — set_block_diagram first`)
      }
      const formula = readString(args.formula).trim()
      if (!formula) throw new Error('formula is required')
      const variables = readVariables(args.variables)
      await focusCurrentBlockIfNeeded(id)
      updateSection(id, { formula, variables })
      flashBlockById(id)
      lastTouchedIdRef.current = id
      engageStreamingAutoscroll(id)
      return { id, updated: true }
    },

    clear_block_diagram: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find((s) => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      updateSection(id, {
        diagram: undefined,
        diagramPosition: undefined,
        formula: undefined,
        variables: undefined,
      })
      flashBlockById(id)
      return { id, cleared: true }
    },

    clear_block_formula: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find((s) => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      updateSection(id, { formula: undefined, variables: undefined })
      flashBlockById(id)
      return { id, cleared: true }
    },
  }
}
