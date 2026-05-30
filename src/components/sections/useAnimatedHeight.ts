import { useLayoutEffect, useRef } from 'react'
import { animateHeightChange, DURATIONS } from '#/utils/blockAnimations'

const DEBOUNCE_MS = 80

export function useAnimatedHeight<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  contentSignal: unknown,
): void {
  const lastHeightRef = useRef<number | null>(null)
  const debounceRef = useRef<number | null>(null)
  const pendingFromRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const measured = el.scrollHeight
    const previous = lastHeightRef.current

    if (previous === null) {
      // First render: just remember the baseline; do not animate.
      lastHeightRef.current = measured
      return
    }

    if (measured === previous) {
      return
    }

    // Preserve the starting height for the upcoming animation. If a debounce
    // is already queued, keep its origin (so coalesced changes interpolate
    // smoothly from the height that was on screen when the burst started).
    if (pendingFromRef.current === null) {
      pendingFromRef.current = previous
    }

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      const node = ref.current
      if (!node) {
        pendingFromRef.current = null
        return
      }
      const from = pendingFromRef.current ?? previous
      const to = node.scrollHeight
      pendingFromRef.current = null
      lastHeightRef.current = to
      void animateHeightChange(node, from, to, DURATIONS.streamingHeight)
    }, DEBOUNCE_MS)
  }, [contentSignal, ref])
}
