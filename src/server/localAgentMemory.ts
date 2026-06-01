import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { z } from 'zod/v4'

const AGENT_MEMORY_DIR = join(process.cwd(), '.codex-browser-agent')
const AGENT_INSTRUCTIONS_PATH = join(AGENT_MEMORY_DIR, 'AGENTS.md')
const EXAMPLES_PATH = join(AGENT_MEMORY_DIR, 'examples.json')

const isoDateSchema = z.iso.datetime({ offset: true })

const diagramNodeSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
})

const diagramEdgeSchema = z.object({
  id: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1),
  target: z.string().trim().min(1),
  label: z.string().optional(),
  highlight: z.boolean().optional(),
})

const diagramSchema = z.object({
  nodes: z.array(diagramNodeSchema),
  edges: z.array(diagramEdgeSchema),
}).superRefine((diagram, ctx) => {
  const nodeIds = new Set<string>()

  diagram.nodes.forEach((node, index) => {
    if (nodeIds.has(node.id)) {
      ctx.addIssue({
        code: 'custom',
        message: `duplicate node id: ${node.id}`,
        path: ['nodes', index, 'id'],
      })
    }
    nodeIds.add(node.id)
  })

  diagram.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.source)) {
      ctx.addIssue({
        code: 'custom',
        message: `edges[${index}].source ${edge.source} not in nodes`,
        path: ['edges', index, 'source'],
      })
    }
    if (!nodeIds.has(edge.target)) {
      ctx.addIssue({
        code: 'custom',
        message: `edges[${index}].target ${edge.target} not in nodes`,
        path: ['edges', index, 'target'],
      })
    }
  })
})

const nonEmptyStringArraySchema = z.array(z.string().trim().min(1)).min(1)

const exampleSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).refine((value) => !/[\r\n]/.test(value), {
    message: 'description must be one line',
  }),
  categories: nonEmptyStringArraySchema,
  tags: nonEmptyStringArraySchema,
  useCases: nonEmptyStringArraySchema,
  audience: z.string().trim().min(1).optional(),
  triggerPhrases: z.array(z.string().trim().min(1)).optional(),
  reusablePatterns: z.array(z.string().trim().min(1)).optional(),
  html: z.string().trim().min(1),
  diagram: diagramSchema.optional(),
  formula: z.string().trim().min(1).optional(),
  variables: z.record(z.string().trim().min(1), z.number().finite()).optional(),
  notes: z.string().trim().min(1).optional(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
}).superRefine((example, ctx) => {
  if (example.formula && !example.diagram) {
    ctx.addIssue({
      code: 'custom',
      message: 'formula requires diagram',
      path: ['formula'],
    })
  }

  if (example.formula && !example.variables) {
    ctx.addIssue({
      code: 'custom',
      message: 'variables required when formula is provided',
      path: ['variables'],
    })
  }
})

const examplesFileSchema = z.object({
  version: z.literal(1),
  examples: z.array(exampleSchema),
}).superRefine((file, ctx) => {
  const ids = new Set<string>()
  file.examples.forEach((example, index) => {
    if (ids.has(example.id)) {
      ctx.addIssue({
        code: 'custom',
        message: `duplicate example id: ${example.id}`,
        path: ['examples', index, 'id'],
      })
    }
    ids.add(example.id)
  })
})

export type AgentExample = z.infer<typeof exampleSchema>
export type AgentExamplesFile = z.infer<typeof examplesFileSchema>
export type AgentExampleSummary = Pick<
  AgentExample,
  'id' | 'title' | 'description' | 'categories' | 'tags' | 'useCases'
>

export type UpsertExampleInput = Omit<AgentExample, 'createdAt' | 'updatedAt'> & {
  createdAt?: string
  updatedAt?: string
}

export function isLocalAgentMemoryEnabled() {
  return import.meta.env.DEV
}

export function validateExample(value: unknown): AgentExample {
  return exampleSchema.parse(value)
}

export function validateExamplesFile(value: unknown): AgentExamplesFile {
  return examplesFileSchema.parse(value)
}

export async function readAgentInstructions(): Promise<string> {
  return readFile(AGENT_INSTRUCTIONS_PATH, 'utf8')
}

export async function replaceAgentInstructionSection({
  heading,
  markdown,
}: {
  heading: string
  markdown: string
}): Promise<{ heading: string; updated: true }> {
  const content = await readAgentInstructions()
  const replacement = buildSection(heading, markdown)
  const next = replaceMarkdownSection(content, heading, replacement)
  await writeTextFile(AGENT_INSTRUCTIONS_PATH, next)
  return { heading, updated: true }
}

export async function appendAgentInstructionSection({
  afterHeading,
  heading,
  markdown,
}: {
  afterHeading: string
  heading: string
  markdown: string
}): Promise<{ heading: string; insertedAfter: string }> {
  const content = await readAgentInstructions()
  if (findHeadingLine(content, heading)) {
    throw new Error(`Section already exists: ${heading}`)
  }
  const section = buildSection(heading, markdown)
  const next = insertMarkdownSectionAfter(content, afterHeading, section)
  await writeTextFile(AGENT_INSTRUCTIONS_PATH, next)
  return { heading, insertedAfter: afterHeading }
}

export async function listExampleSummaries(): Promise<AgentExampleSummary[]> {
  const file = await readExamplesFile()
  return file.examples.map(({ id, title, description, categories, tags, useCases }) => ({
    id,
    title,
    description,
    categories,
    tags,
    useCases,
  }))
}

export async function getExamples(ids: string[]): Promise<AgentExample[]> {
  const wanted = new Set(ids.map((id) => id.trim()).filter(Boolean))
  if (wanted.size === 0) throw new Error('ids must contain at least one id')

  const file = await readExamplesFile()
  const examples = file.examples.filter((example) => wanted.has(example.id))
  const found = new Set(examples.map((example) => example.id))
  const missing = [...wanted].filter((id) => !found.has(id))

  if (missing.length > 0) {
    throw new Error(`Examples not found: ${missing.join(', ')}`)
  }

  return examples
}

export async function upsertExample(input: UpsertExampleInput): Promise<{ id: string; created: boolean; updatedAt: string }> {
  const file = await readExamplesFile()
  const now = new Date().toISOString()
  const merged = mergeUpsertExample(file, input, now)
  await writeExamplesFile(merged.file)
  return merged.result
}

export async function deleteExample(id: string): Promise<{ id: string; deleted: true }> {
  const trimmedId = id.trim()
  if (!trimmedId) throw new Error('id is required')

  const file = await readExamplesFile()
  const nextExamples = file.examples.filter((example) => example.id !== trimmedId)
  if (nextExamples.length === file.examples.length) {
    throw new Error(`Example not found: ${trimmedId}`)
  }

  await writeExamplesFile({ version: 1, examples: nextExamples })
  return { id: trimmedId, deleted: true }
}

export async function readExamplesFile(): Promise<AgentExamplesFile> {
  try {
    const raw = await readFile(EXAMPLES_PATH, 'utf8')
    return validateExamplesFile(JSON.parse(raw))
  } catch (error) {
    if (isFileNotFound(error)) {
      return { version: 1, examples: [] }
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in examples.json: ${error.message}`)
    }
    throw error
  }
}

export function replaceMarkdownSection(content: string, heading: string, replacementSection: string): string {
  const target = findHeadingLine(content, heading)
  if (!target) throw new Error(`Section not found: ${heading}`)

  const lines = splitLines(content)
  const end = findNextHeadingIndex(lines, target.index + 1, target.level)
  const replacementLines = splitLines(replacementSection.trimEnd())
  const suffixLines = lines.slice(end)
  const nextLines = [
    ...lines.slice(0, target.index),
    ...replacementLines,
    ...sectionSuffixSpacer(suffixLines),
    ...suffixLines,
  ]

  return normalizeMarkdownOutput(nextLines.join('\n'))
}

export function mergeUpsertExample(
  file: AgentExamplesFile,
  input: UpsertExampleInput,
  now: string,
): {
  file: AgentExamplesFile
  result: { id: string; created: boolean; updatedAt: string }
} {
  const existingIndex = file.examples.findIndex((example) => example.id === input.id)
  const existing = existingIndex >= 0 ? file.examples[existingIndex] : null
  const candidate = validateExample({
    ...input,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  })
  const examples = [...file.examples]

  if (existing) {
    examples[existingIndex] = candidate
  } else {
    examples.push(candidate)
  }

  const nextFile = validateExamplesFile({ version: 1, examples })

  return {
    file: nextFile,
    result: { id: candidate.id, created: !existing, updatedAt: candidate.updatedAt },
  }
}

export function insertMarkdownSectionAfter(content: string, afterHeading: string, section: string): string {
  const target = findHeadingLine(content, afterHeading)
  if (!target) throw new Error(`Section not found: ${afterHeading}`)

  const lines = splitLines(content)
  const end = findNextHeadingIndex(lines, target.index + 1, target.level)
  const sectionLines = splitLines(section.trimEnd())
  const suffixLines = lines.slice(end)
  const nextLines = [
    ...lines.slice(0, end),
    '',
    ...sectionLines,
    ...sectionSuffixSpacer(suffixLines),
    ...suffixLines,
  ]

  return normalizeMarkdownOutput(nextLines.join('\n'))
}

async function writeExamplesFile(file: AgentExamplesFile) {
  const validated = validateExamplesFile(file)
  await writeTextFile(EXAMPLES_PATH, `${JSON.stringify(validated, null, 2)}\n`)
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf8')
}

function buildSection(heading: string, markdown: string) {
  const normalizedHeading = heading.trim()
  const normalizedMarkdown = markdown.trim()
  if (!/^#{1,6}\s+\S/.test(normalizedHeading)) {
    throw new Error('heading must be a markdown heading, e.g. "## Local Memory"')
  }
  if (!normalizedMarkdown) throw new Error('markdown is required')
  return `${normalizedHeading}\n\n${normalizedMarkdown}\n`
}

function findHeadingLine(content: string, heading: string): { index: number; level: number } | null {
  const expected = heading.trim()
  const lines = splitLines(content)

  for (const [index, line] of lines.entries()) {
    if (line.trim() !== expected) continue
    const match = /^(#{1,6})\s+\S/.exec(line.trim())
    if (!match) continue
    return { index, level: match[1].length }
  }

  return null
}

function findNextHeadingIndex(lines: string[], start: number, level: number) {
  for (let index = start; index < lines.length; index++) {
    const match = /^(#{1,6})\s+\S/.exec(lines[index].trim())
    if (match && match[1].length <= level) return index
  }
  return lines.length
}

function splitLines(value: string) {
  return value.replace(/\r\n/g, '\n').split('\n')
}

function sectionSuffixSpacer(suffixLines: string[]) {
  return suffixLines.length > 0 && suffixLines[0].trim() !== '' ? [''] : []
}

function normalizeMarkdownOutput(value: string) {
  return `${value.replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

function isFileNotFound(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
