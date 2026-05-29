import { describe, it, expect } from 'vitest'
import { resolveSection, sectionsReducer } from './SectionContext'
import type { SectionConfig } from './SectionContext'

describe('resolveSection — theme cycle', () => {
  it('assigns dark-1 at position 0', () => {
    expect(resolveSection({ content: '' }, 0).theme).toBe('dark-1')
  })
  it('assigns light-2 at position 1', () => {
    expect(resolveSection({ content: '' }, 1).theme).toBe('light-2')
  })
  it('assigns dark-2 at position 2', () => {
    expect(resolveSection({ content: '' }, 2).theme).toBe('dark-2')
  })
  it('assigns light-1 at position 3', () => {
    expect(resolveSection({ content: '' }, 3).theme).toBe('light-1')
  })
  it('wraps back to dark-1 at position 4', () => {
    expect(resolveSection({ content: '' }, 4).theme).toBe('dark-1')
  })
  it('respects explicit theme override', () => {
    expect(resolveSection({ content: '', theme: 'dark-2' }, 0).theme).toBe('dark-2')
  })
})

describe('resolveSection — tab cycle', () => {
  it('assigns center at position 0', () => {
    expect(resolveSection({ content: '' }, 0).tab).toBe('center')
  })
  it('assigns right at position 1', () => {
    expect(resolveSection({ content: '' }, 1).tab).toBe('right')
  })
  it('assigns left at position 2', () => {
    expect(resolveSection({ content: '' }, 2).tab).toBe('left')
  })
  it('wraps back to center at position 3', () => {
    expect(resolveSection({ content: '' }, 3).tab).toBe('center')
  })
  it('forces tab to none when theme is closing', () => {
    expect(resolveSection({ content: '', theme: 'closing' }, 0).tab).toBe('none')
  })
  it('respects explicit tab override', () => {
    expect(resolveSection({ content: '', tab: 'right' }, 0).tab).toBe('right')
  })
})

describe('resolveSection — id + content', () => {
  it('generates a new id when id is not provided', () => {
    expect(resolveSection({ content: '' }, 0).id).toBeTruthy()
  })
  it('generates unique ids', () => {
    const a = resolveSection({ content: '' }, 0)
    const b = resolveSection({ content: '' }, 0)
    expect(a.id).not.toBe(b.id)
  })
  it('preserves content', () => {
    expect(resolveSection({ content: '<p>hello</p>' }, 0).content).toBe('<p>hello</p>')
  })
  it('preserves rule', () => {
    expect(resolveSection({ content: '', rule: true }, 0).rule).toBe(true)
  })
  it('preserves className', () => {
    expect(resolveSection({ content: '', className: 'foo' }, 0).className).toBe('foo')
  })
  it('preserves topic', () => {
    expect(resolveSection({ content: '', topic: 'Sobre IA' }, 0).topic).toBe('Sobre IA')
  })
  it('topic is undefined when not provided', () => {
    expect(resolveSection({ content: '' }, 0).topic).toBeUndefined()
  })
  it('uses pre-generated id when provided', () => {
    expect(resolveSection({ content: '', id: 'pre-set' }, 0).id).toBe('pre-set')
  })
})

describe('sectionsReducer', () => {
  const empty = { sections: [] as SectionConfig[] }

  it('ADD appends a section with auto-resolved theme and tab', () => {
    const state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'hello' } })
    expect(state.sections).toHaveLength(1)
    expect(state.sections[0].content).toBe('hello')
    expect(state.sections[0].theme).toBe('dark-1')
    expect(state.sections[0].tab).toBe('center')
  })

  it('ADD uses nonClosingCount — closing sections do not advance the cycle', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'a' } })
    state = sectionsReducer(state, { type: 'ADD', payload: { content: 'b', theme: 'closing' } })
    state = sectionsReducer(state, { type: 'ADD', payload: { content: 'c' } })
    expect(state.sections[2].theme).toBe('light-2')
    expect(state.sections[2].tab).toBe('right')
  })

  it('REMOVE removes section by id', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: '' } })
    const { id } = state.sections[0]
    state = sectionsReducer(state, { type: 'REMOVE', id })
    expect(state.sections).toHaveLength(0)
  })

  it('REMOVE leaves other sections untouched', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'a' } })
    state = sectionsReducer(state, { type: 'ADD', payload: { content: 'b' } })
    const idToRemove = state.sections[0].id
    state = sectionsReducer(state, { type: 'REMOVE', id: idToRemove })
    expect(state.sections).toHaveLength(1)
    expect(state.sections[0].content).toBe('b')
  })

  it('CLEAR removes all sections', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: '' } })
    state = sectionsReducer(state, { type: 'ADD', payload: { content: '' } })
    state = sectionsReducer(state, { type: 'CLEAR' })
    expect(state.sections).toHaveLength(0)
  })

  it('RESET replaces all sections and re-resolves them', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'old' } })
    state = sectionsReducer(state, {
      type: 'RESET',
      payload: [{ content: 'new1' }, { content: 'new2' }],
    })
    expect(state.sections).toHaveLength(2)
    expect(state.sections[0].content).toBe('new1')
    expect(state.sections[1].content).toBe('new2')
    expect(state.sections[0].theme).toBe('dark-1')
    expect(state.sections[1].theme).toBe('light-2')
  })

  it('ADD preserves topic', () => {
    const state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'hi', topic: 'Test topic' } })
    expect(state.sections[0].topic).toBe('Test topic')
  })

  it('UPDATE can patch topic', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'a' } })
    const { id } = state.sections[0]
    state = sectionsReducer(state, { type: 'UPDATE', id, payload: { topic: 'New topic' } })
    expect(state.sections[0].topic).toBe('New topic')
  })

  it('ADD inserts before the pinned section when one exists', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { id: 'a', content: 'a' } })
    state = sectionsReducer(state, { type: 'ADD', payload: { id: 'tail', content: 'tail', pinned: true } })
    state = sectionsReducer(state, { type: 'ADD', payload: { id: 'b', content: 'b' } })
    expect(state.sections.map(s => s.id)).toEqual(['a', 'b', 'tail'])
  })

  it('ADD appends when the new section is itself pinned', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { id: 'a', content: 'a' } })
    state = sectionsReducer(state, { type: 'ADD', payload: { id: 'tail', content: 'tail', pinned: true } })
    expect(state.sections.map(s => s.id)).toEqual(['a', 'tail'])
  })

  it('ADD appends normally when no pinned section exists', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { id: 'a', content: 'a' } })
    state = sectionsReducer(state, { type: 'ADD', payload: { id: 'b', content: 'b' } })
    expect(state.sections.map(s => s.id)).toEqual(['a', 'b'])
  })

  it('RESET preserves pinned flag on sections', () => {
    const state = sectionsReducer(empty, {
      type: 'RESET',
      payload: [{ content: 'one' }, { content: 'tail', pinned: true }],
    })
    expect(state.sections[0].pinned).toBeUndefined()
    expect(state.sections[1].pinned).toBe(true)
  })
})

describe('resolveSection — diagram fields', () => {
  it('preserves diagram when provided', () => {
    const diagram = { nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }], edges: [] }
    expect(resolveSection({ content: '', diagram }, 0).diagram).toEqual(diagram)
  })

  it('preserves diagramPosition when provided', () => {
    expect(resolveSection({ content: '', diagramPosition: 'before' }, 0).diagramPosition).toBe('before')
  })

  it('preserves formula when provided', () => {
    expect(resolveSection({ content: '', formula: 'a * b' }, 0).formula).toBe('a * b')
  })

  it('preserves variables when provided', () => {
    expect(resolveSection({ content: '', variables: { a: 1, b: 2 } }, 0).variables).toEqual({ a: 1, b: 2 })
  })

  it('diagram is undefined when not provided', () => {
    expect(resolveSection({ content: '' }, 0).diagram).toBeUndefined()
  })
})

describe('sectionsReducer — diagram UPDATE merge', () => {
  const empty = { sections: [] as SectionConfig[] }

  it('UPDATE can patch diagram without touching content', () => {
    let state = sectionsReducer(empty, {
      type: 'ADD',
      payload: { id: 'a', content: '<p>hi</p>' },
    })
    const diagram = { nodes: [{ id: 'n1', label: 'N1', x: 0, y: 0 }], edges: [] }
    state = sectionsReducer(state, { type: 'UPDATE', id: 'a', payload: { diagram } })
    expect(state.sections[0].diagram).toEqual(diagram)
    expect(state.sections[0].content).toBe('<p>hi</p>')
  })

  it('UPDATE can patch formula and variables without touching diagram', () => {
    const diagram = { nodes: [{ id: 'n1', label: 'N1', x: 0, y: 0 }], edges: [] }
    let state = sectionsReducer(empty, {
      type: 'ADD',
      payload: { id: 'a', content: '', diagram },
    })
    state = sectionsReducer(state, {
      type: 'UPDATE',
      id: 'a',
      payload: { formula: 'a * b', variables: { a: 2, b: 3 } },
    })
    expect(state.sections[0].formula).toBe('a * b')
    expect(state.sections[0].variables).toEqual({ a: 2, b: 3 })
    expect(state.sections[0].diagram).toEqual(diagram)
  })

  it('UPDATE can clear diagram by setting it to undefined', () => {
    const diagram = { nodes: [{ id: 'n1', label: 'N1', x: 0, y: 0 }], edges: [] }
    let state = sectionsReducer(empty, {
      type: 'ADD',
      payload: { id: 'a', content: '', diagram, formula: 'a', variables: { a: 1 } },
    })
    state = sectionsReducer(state, {
      type: 'UPDATE',
      id: 'a',
      payload: { diagram: undefined, formula: undefined, variables: undefined, diagramPosition: undefined },
    })
    expect(state.sections[0].diagram).toBeUndefined()
    expect(state.sections[0].formula).toBeUndefined()
    expect(state.sections[0].variables).toBeUndefined()
  })
})
