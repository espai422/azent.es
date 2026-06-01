export type ClientStreamEvent =
  | { type: 'thread.started'; threadId: string }
  | { type: 'turn.started' }
  | { type: 'message.completed'; text: string }
  | { type: 'reasoning.completed'; text: string }
  | { type: 'tool.started'; id: string; tool: string; args: unknown }
  | { type: 'tool.completed'; id: string; tool: string; result: unknown }
  | { type: 'tool.failed'; id: string; tool: string; error: string }
  | { type: 'error'; message: string }
  | { type: 'turn.completed'; finalResponse: string }
