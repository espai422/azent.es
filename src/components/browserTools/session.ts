import { createId } from '#/utils/id'

export const SESSION_STORAGE_KEY = 'azent.browserSessionId'

export function getSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const next = createId()
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next)
  return next
}
