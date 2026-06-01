export type BrowserToolEvent =
  | { type: 'session.ready'; sessionId: string }
  | { type: 'heartbeat'; now: number }
  | { type: 'tool.call'; callId: string; toolName: string; args: unknown }

export type ToolResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: string }

export type BrowserToolHandler = (args: unknown) => unknown | Promise<unknown>

export type BrowserToolHandlers = Record<string, BrowserToolHandler>
