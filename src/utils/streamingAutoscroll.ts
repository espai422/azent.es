import { prefersReducedMotion } from './blockAnimations'

const TARGET_VIEWPORT_RATIO = 0.9
const OPT_OUT_PX = 150
const IDLE_MS = 1500
const FOLLOW_LERP = 0.25

type State =
  | { kind: 'idle' }
  | { kind: 'engaged'; blockId: string; lastTouchAt: number; lastScrollY: number; rafId: number }
  | { kind: 'optedOut'; blockId: string }

let state: State = { kind: 'idle' }
let suppressed = false

function onScroll(): void {
  if (state.kind !== 'engaged') return
  if (suppressed) { suppressed = false; return }
  if (Math.abs(window.scrollY - state.lastScrollY) > OPT_OUT_PX) {
    window.cancelAnimationFrame(state.rafId)
    window.removeEventListener('scroll', onScroll)
    state = { kind: 'optedOut', blockId: state.blockId }
  }
}

function tick(): void {
  if (state.kind !== 'engaged') return

  const el = document.getElementById(state.blockId)
  if (!el) { setIdle(); return }

  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  if (vh > 0) {
    const targetBottomY = vh * TARGET_VIEWPORT_RATIO
    const overflow = rect.bottom - targetBottomY
    if (overflow > 0) {
      const newScrollY = window.scrollY + overflow * FOLLOW_LERP
      state.lastScrollY = newScrollY
      suppressed = true
      window.scrollTo({ top: newScrollY, behavior: 'auto' })
    }
  }

  if (performance.now() - state.lastTouchAt > IDLE_MS) { setIdle(); return }

  state.rafId = window.requestAnimationFrame(tick)
}

function setIdle(): void {
  if (state.kind === 'engaged') {
    window.cancelAnimationFrame(state.rafId)
  }
  window.removeEventListener('scroll', onScroll)
  suppressed = false
  state = { kind: 'idle' }
}

export function engageStreamingAutoscroll(blockId: string): void {
  if (typeof window === 'undefined') return
  if (prefersReducedMotion()) return

  if (state.kind === 'idle') {
    window.addEventListener('scroll', onScroll, { passive: true })
    const rafId = window.requestAnimationFrame(tick)
    state = {
      kind: 'engaged',
      blockId,
      lastTouchAt: performance.now(),
      lastScrollY: window.scrollY,
      rafId,
    }
    return
  }

  if (state.kind === 'engaged') {
    state.lastTouchAt = performance.now()
    if (state.blockId !== blockId) state.blockId = blockId
    return
  }

  // optedOut handled in Task 5.
}

export function disengageStreamingAutoscroll(): void {
  setIdle()
}

// Test-only escape hatch — do not use in production code.
export function _getStateForTests(): State {
  return state
}
