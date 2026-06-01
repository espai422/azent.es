export type PromptStatus = 'idle' | 'sending' | 'sent' | 'error'

export type Activity = {
  id: string
  label: string
  state: 'active' | 'done' | 'error'
}
