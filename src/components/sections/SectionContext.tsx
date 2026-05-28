import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { createId } from '#/utils/id'

export type SectionTheme = 'dark-1' | 'light-2' | 'dark-2' | 'light-1' | 'closing'
export type TabVariant = 'center' | 'right' | 'left' | 'none'

export interface SectionConfig {
  id: string
  theme: SectionTheme
  tab: TabVariant
  rule?: boolean
  content: string
  topic?: string
  className?: string
}

export type SectionInput = {
  id?: string
  theme?: SectionTheme
  tab?: TabVariant
  rule?: boolean
  content: string
  topic?: string
  className?: string
}

const COLOR_CYCLE: SectionTheme[] = ['dark-1', 'light-2', 'dark-2', 'light-1']
const TAB_CYCLE: TabVariant[] = ['center', 'right', 'left']

export function resolveSection(input: SectionInput, nonClosingCount: number): SectionConfig {
  const theme = input.theme ?? COLOR_CYCLE[nonClosingCount % 4]
  const tab = theme === 'closing' ? 'none' : (input.tab ?? TAB_CYCLE[nonClosingCount % 3])
  return {
    id: input.id ?? createId(),
    theme,
    tab,
    rule: input.rule,
    content: input.content,
    topic: input.topic,
    className: input.className,
  }
}

// ─── Reducer ────────────────────────────────────────────────────────────────

interface SectionsState { sections: SectionConfig[] }

export type SectionsAction =
  | { type: 'ADD'; payload: SectionInput }
  | { type: 'UPDATE'; id: string; payload: Partial<SectionInput> }
  | { type: 'REMOVE'; id: string }
  | { type: 'MOVE'; id: string; toIndex: number }
  | { type: 'CLEAR' }
  | { type: 'RESET'; payload: SectionInput[] }

function countNonClosing(sections: SectionConfig[]): number {
  return sections.filter(s => s.theme !== 'closing').length
}

export function sectionsReducer(state: SectionsState, action: SectionsAction): SectionsState {
  switch (action.type) {
    case 'ADD': {
      const count = countNonClosing(state.sections)
      return { sections: [...state.sections, resolveSection(action.payload, count)] }
    }
    case 'UPDATE':
      return {
        sections: state.sections.map((section) =>
          section.id === action.id ? { ...section, ...action.payload } : section,
        ),
      }
    case 'REMOVE':
      return { sections: state.sections.filter(s => s.id !== action.id) }
    case 'MOVE': {
      const fromIndex = state.sections.findIndex((section) => section.id === action.id)
      if (fromIndex === -1) return state

      const sections = [...state.sections]
      const [section] = sections.splice(fromIndex, 1)
      const toIndex = Math.max(0, Math.min(action.toIndex, sections.length))
      sections.splice(toIndex, 0, section)

      return { sections }
    }
    case 'CLEAR':
      return { sections: [] }
    case 'RESET': {
      let nonClosingCount = 0
      const sections = action.payload.map(input => {
        const resolved = resolveSection(input, nonClosingCount)
        if (resolved.theme !== 'closing') nonClosingCount++
        return resolved
      })
      return { sections }
    }
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface SectionsContextValue {
  sections: SectionConfig[]
  addSection: (input: SectionInput) => void
  updateSection: (id: string, input: Partial<SectionInput>) => void
  removeSection: (id: string) => void
  moveSection: (id: string, toIndex: number) => void
  clearSections: () => void
  resetSections: (inputs: SectionInput[]) => void
}

const SectionsContext = createContext<SectionsContextValue | null>(null)

function buildInitialState(inputs: SectionInput[] = []): SectionsState {
  return sectionsReducer({ sections: [] }, { type: 'RESET', payload: inputs })
}

export function SectionProvider({
  children,
  initialSections,
}: {
  children: ReactNode
  initialSections?: SectionInput[]
}) {
  const [state, dispatch] = useReducer(sectionsReducer, initialSections, buildInitialState)

  const addSection = useCallback((input: SectionInput) => dispatch({ type: 'ADD', payload: input }), [])
  const updateSection = useCallback((id: string, input: Partial<SectionInput>) => dispatch({ type: 'UPDATE', id, payload: input }), [])
  const removeSection = useCallback((id: string) => dispatch({ type: 'REMOVE', id }), [])
  const moveSection = useCallback((id: string, toIndex: number) => dispatch({ type: 'MOVE', id, toIndex }), [])
  const clearSections = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const resetSections = useCallback((inputs: SectionInput[]) => dispatch({ type: 'RESET', payload: inputs }), [])

  const value = useMemo<SectionsContextValue>(() => ({
    sections: state.sections,
    addSection,
    updateSection,
    removeSection,
    moveSection,
    clearSections,
    resetSections,
  }), [state.sections, addSection, updateSection, removeSection, moveSection, clearSections, resetSections])

  return <SectionsContext.Provider value={value}>{children}</SectionsContext.Provider>
}

export function useSections(): SectionsContextValue {
  const ctx = useContext(SectionsContext)
  if (!ctx) throw new Error('useSections must be used within SectionProvider')
  return ctx
}
