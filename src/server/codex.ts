import { Codex, type Thread } from '@openai/codex-sdk'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { CODEX_MODEL, CODEX_MODEL_REASONING_EFFORT } from '../../codex.config'

type SessionThread = {
  thread: Thread
  activeTurn: Promise<void> | null
  prewarmTurn: Promise<void> | null
}

let codex: Codex | null = null
let configuredMcpUrl: string | null = null
const sessionThreads = new Map<string, SessionThread>()
const browserAgentWorkingDirectory = join(process.cwd(), '.codex-browser-agent')

function ensureBrowserAgentWorkingDirectory() {
  mkdirSync(browserAgentWorkingDirectory, { recursive: true })
}

export function getCodex(appOrigin: string): Codex {
  const mcpUrl = `${appOrigin}/api/mcp/browser-tools`

  if (codex && configuredMcpUrl === mcpUrl) return codex

  codex = new Codex({
    config: {
      mcp_servers: {
        browser_tools: {
          url: mcpUrl,
          default_tools_approval_mode: 'approve',
        },
      },
    },
  })
  configuredMcpUrl = mcpUrl
  sessionThreads.clear()

  return codex
}

export function getThreadForBrowserSession(browserSessionId: string, appOrigin: string): SessionThread {
  const existing = sessionThreads.get(browserSessionId)
  if (existing) return existing

  ensureBrowserAgentWorkingDirectory()

  const thread = getCodex(appOrigin).startThread({
    skipGitRepoCheck: true,
    workingDirectory: browserAgentWorkingDirectory,
    approvalPolicy: 'never',
    sandboxMode: 'read-only',
    ...(CODEX_MODEL ? { model: CODEX_MODEL } : {}),
    ...(CODEX_MODEL_REASONING_EFFORT ? { modelReasoningEffort: CODEX_MODEL_REASONING_EFFORT } : {}),
  })

  const next: SessionThread = { thread, activeTurn: null, prewarmTurn: null }
  sessionThreads.set(browserSessionId, next)
  return next
}

export function setBrowserSessionActiveTurn(browserSessionId: string, turn: Promise<void> | null) {
  const sessionThread = sessionThreads.get(browserSessionId)
  if (sessionThread) sessionThread.activeTurn = turn
}

export function prewarmThreadForBrowserSession(
  browserSessionId: string,
  appOrigin: string,
  snapshot: unknown,
): void {
  if (sessionThreads.has(browserSessionId)) return

  const sessionThread = getThreadForBrowserSession(browserSessionId, appOrigin)

  const prompt = [
    'You are the editing agent for an interactive web page. You will receive user requests soon.',
    'Below is the initial snapshot of the page (same shape as the output of get_page_snapshot).',
    'Memorise it — keep it as your mental model of the current page state.',
    'Do NOT call any tool. Reply with the single word "ready" and wait for the next user message.',
    '',
    'Initial snapshot:',
    JSON.stringify(snapshot),
  ].join('\n')

  const prewarmTurn = (async () => {
    try {
      const { events } = await sessionThread.thread.runStreamed(prompt)
      for await (const _event of events) {
        void _event
      }
    } catch (error) {
      console.error('[codex] prewarm failed', error)
    } finally {
      sessionThread.prewarmTurn = null
    }
  })()

  sessionThread.prewarmTurn = prewarmTurn
}
