import { describe, expect, it } from 'vitest'
import {
  insertMarkdownSectionAfter,
  mergeUpsertExample,
  replaceMarkdownSection,
  validateExample,
  validateExamplesFile,
  type AgentExamplesFile,
  type UpsertExampleInput,
} from './localAgentMemory'
import { handleLocalAgentMemoryMcpRequest } from './localAgentMemoryMcp'

const createdAt = '2026-06-01T10:00:00.000Z'
const updatedAt = '2026-06-01T11:00:00.000Z'

function exampleInput(overrides: Partial<UpsertExampleInput> = {}): UpsertExampleInput {
  return {
    id: 'erp-onboarding-flow',
    title: 'ERP onboarding flow',
    description: 'Bloque visual para explicar un onboarding operativo conectado a ERP y equipo interno.',
    categories: ['automatizacion', 'erp'],
    tags: ['diagram-flow', 'block-cards'],
    useCases: ['Explicar integraciones operativas'],
    html: '<h2>Onboarding sin friccion</h2><p>El sistema coordina pasos y excepciones.</p>',
    ...overrides,
  }
}

describe('local agent memory examples', () => {
  it('accepts a valid example', () => {
    expect(validateExample({
      ...exampleInput(),
      createdAt,
      updatedAt,
    })).toMatchObject({
      id: 'erp-onboarding-flow',
      categories: ['automatizacion', 'erp'],
    })
  })

  it('creates and edits examples while preserving createdAt and refreshing updatedAt', () => {
    const emptyFile: AgentExamplesFile = { version: 1, examples: [] }
    const created = mergeUpsertExample(emptyFile, exampleInput(), createdAt)

    expect(created.result).toEqual({
      id: 'erp-onboarding-flow',
      created: true,
      updatedAt: createdAt,
    })
    expect(created.file.examples[0].createdAt).toBe(createdAt)

    const edited = mergeUpsertExample(
      created.file,
      exampleInput({ title: 'ERP onboarding edited' }),
      updatedAt,
    )

    expect(edited.result).toEqual({
      id: 'erp-onboarding-flow',
      created: false,
      updatedAt,
    })
    expect(edited.file.examples).toHaveLength(1)
    expect(edited.file.examples[0]).toMatchObject({
      title: 'ERP onboarding edited',
      createdAt,
      updatedAt,
    })
  })

  it('rejects malformed descriptions, diagrams and formula data', () => {
    expect(() => validateExample({
      ...exampleInput({ description: 'line one\nline two' }),
      createdAt,
      updatedAt,
    })).toThrow('description must be one line')

    expect(() => validateExample({
      ...exampleInput({
        diagram: {
          nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
          edges: [{ source: 'a', target: 'missing' }],
        },
      }),
      createdAt,
      updatedAt,
    })).toThrow('edges[0].target missing not in nodes')

    expect(() => validateExample({
      ...exampleInput({ formula: 'horas * coste', variables: { horas: 10, coste: 40 } }),
      createdAt,
      updatedAt,
    })).toThrow('formula requires diagram')
  })

  it('rejects duplicate ids in examples.json', () => {
    const example = validateExample({ ...exampleInput(), createdAt, updatedAt })
    expect(() => validateExamplesFile({
      version: 1,
      examples: [example, example],
    })).toThrow('duplicate example id: erp-onboarding-flow')
  })
})

describe('local agent instruction sections', () => {
  const markdown = [
    '# Agent',
    '',
    'Intro.',
    '',
    '## One',
    '',
    'First body.',
    '',
    '## Two',
    '',
    'Second body.',
    '',
  ].join('\n')

  it('replaces an existing section', () => {
    expect(replaceMarkdownSection(markdown, '## One', '## One\n\nReplacement.\n')).toBe([
      '# Agent',
      '',
      'Intro.',
      '',
      '## One',
      '',
      'Replacement.',
      '',
      '## Two',
      '',
      'Second body.',
      '',
    ].join('\n'))
  })

  it('inserts a section after an existing heading', () => {
    expect(insertMarkdownSectionAfter(markdown, '## One', '## Inserted\n\nInserted body.\n')).toBe([
      '# Agent',
      '',
      'Intro.',
      '',
      '## One',
      '',
      'First body.',
      '',
      '## Inserted',
      '',
      'Inserted body.',
      '',
      '## Two',
      '',
      'Second body.',
      '',
    ].join('\n'))
  })

  it('fails when a heading is missing', () => {
    expect(() => replaceMarkdownSection(markdown, '## Missing', '## Missing\n\nBody.\n'))
      .toThrow('Section not found: ## Missing')
  })
})

describe('local agent memory MCP route guard', () => {
  it('responds to preflight when enabled in local dev', async () => {
    const response = await handleLocalAgentMemoryMcpRequest(
      new Request('http://localhost/api/mcp/local-agent-memory', { method: 'OPTIONS' }),
      true,
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('returns 404 when disabled outside local dev', async () => {
    const response = await handleLocalAgentMemoryMcpRequest(
      new Request('http://localhost/api/mcp/local-agent-memory'),
      false,
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'local_agent_memory is only available during pnpm dev',
    })
  })
})
