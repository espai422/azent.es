import { createServerFn } from '@tanstack/react-start'

export const sendMessage = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const { message } = data as { message: string }
    if (!message?.trim()) throw new Error('Message is required')
    return { message }
  })
  .handler(async () => {
    throw new Error('Legacy chat is disabled. Use the browser-controlled chat entrypoint.')
  })
