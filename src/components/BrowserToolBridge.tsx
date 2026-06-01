import { useEffect, useMemo, useRef, useState } from 'react'
import { useSections } from '#/components/sections'
import { createBrowserToolHandlers } from './browserTools/handlers'
import { getSessionId } from './browserTools/session'
import { createPageSnapshot } from './browserTools/snapshot'
import type { BrowserToolEvent, ToolResponse } from './browserTools/types'

export function BrowserToolBridge() {
  const { sections, addSection, updateSection, removeSection } = useSections()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sectionsRef = useRef(sections)
  const lastTouchedIdRef = useRef<string | null>(null)

  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  const tools = useMemo(() => createBrowserToolHandlers({
    sectionsRef,
    lastTouchedIdRef,
    addSection,
    updateSection,
    removeSection,
  }), [addSection, removeSection, updateSection])

  useEffect(() => {
    const nextSessionId = getSessionId()
    setSessionId(nextSessionId)

    window.dispatchEvent(new CustomEvent('azent:browser-session', { detail: { sessionId: nextSessionId } }))

    const initSnapshot = createPageSnapshot({
      title: document.title,
      url: window.location.href,
      sections: sectionsRef.current,
    })

    void fetch('/api/chat/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ browserSessionId: nextSessionId, snapshot: initSnapshot }),
    }).catch((error) => {
      console.error('[browser-tool-bridge] prewarm init failed', error)
    })

    const source = new EventSource(`/api/browser-session/events?sessionId=${encodeURIComponent(nextSessionId)}`)

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as BrowserToolEvent
      if (payload.type !== 'tool.call') return

      void (async () => {
        const tool = tools[payload.toolName]
        let response: ToolResponse

        try {
          response = tool
            ? { ok: true, result: await tool(payload.args) }
            : { ok: false, error: `Unknown browser tool: ${payload.toolName}` }
        } catch (error) {
          response = {
            ok: false,
            error: error instanceof Error ? error.message : 'Browser tool failed',
          }
        }

        await fetch('/api/browser-tools/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: nextSessionId,
            callId: payload.callId,
            ...response,
          }),
        })
      })()
    }

    return () => source.close()
  }, [tools])

  return (
    <div
      data-browser-session-id={sessionId || undefined}
      hidden
      title={sessionId || undefined}
    />
  )
}
