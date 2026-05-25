import { createServerFn } from '@tanstack/react-start'
import { Codex } from '@openai/codex-sdk'

const codex = new Codex()

export const sendMessage = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const { message } = data as { message: string }
    if (!message?.trim()) throw new Error('Message is required')
    return { message }
  })
  .handler(async ({ data }) => {
    const thread = codex.startThread()
    const result = await thread.run(data.message, { skipGitRepoCheck: true })
    return { reply: result.finalResponse }
  })
