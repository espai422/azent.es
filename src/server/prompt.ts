import { createServerFn } from '@tanstack/react-start'

export const submitPrompt = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const { prompt } = data as { prompt?: string }
    const trimmedPrompt = prompt?.trim()

    if (!trimmedPrompt) throw new Error('Prompt is required')

    return { prompt: trimmedPrompt }
  })
  .handler(async ({ data }) => {
    return {
      accepted: true,
      prompt: data.prompt,
    }
  })
