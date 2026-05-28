import { Codex, type Thread } from '@openai/codex-sdk'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

type SessionThread = {
  thread: Thread
  activeTurn: Promise<void> | null
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
  })

  const next = { thread, activeTurn: null }
  sessionThreads.set(browserSessionId, next)
  return next
}

export function setBrowserSessionActiveTurn(browserSessionId: string, turn: Promise<void> | null) {
  const sessionThread = sessionThreads.get(browserSessionId)
  if (sessionThread) sessionThread.activeTurn = turn
}
