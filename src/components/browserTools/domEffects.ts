import {
  DURATIONS,
  flashBlockOutline,
  revealBlockSymmetric,
  scrollSoElementFocused,
  scrollSoPointAt,
} from '#/utils/blockAnimations'

export async function focusBlockIfNeeded(id: string, lastTouchedId: string | null) {
  if (lastTouchedId === id) return
  const element = document.getElementById(id)
  if (!element) return
  const rect = element.getBoundingClientRect()
  const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
  if (fullyVisible) return
  await scrollSoElementFocused(element, DURATIONS.scrollFocus)
}

export function focusAndFlashElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
  if (!isInView) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  animateOutline(element, 1_200)
}

export function flashBlockById(id: string) {
  setTimeout(() => {
    const el = document.getElementById(id)
    if (el) flashBlockOutline(el)
  }, 0)
}

export function flashReplacementById(id: string) {
  setTimeout(() => {
    const el = document.getElementById(id)
    if (el) animateOutline(el, 400, 0.7, '-8px')
  }, 0)
}

export async function scrollToPinnedBoundary(pinnedSectionId: string | undefined) {
  let boundaryY: number
  if (pinnedSectionId) {
    const pinnedEl = document.getElementById(pinnedSectionId)
    boundaryY = pinnedEl
      ? pinnedEl.getBoundingClientRect().top + window.scrollY
      : document.documentElement.scrollHeight
  } else {
    boundaryY = document.documentElement.scrollHeight
  }
  await scrollSoPointAt(boundaryY, 0.10, DURATIONS.scrollInsertion)
}

export async function waitForNextPaint() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => { requestAnimationFrame(() => resolve()) })
  })
}

export async function revealInsertedBlock(id: string) {
  const element = document.getElementById(id)
  if (!element) return

  const measured = element.scrollHeight
  const naturalHeight = measured === 0
    ? 200
    : Math.min(measured, Math.round(window.innerHeight * 0.7))
  await revealBlockSymmetric(element, naturalHeight, DURATIONS.revealSymmetric)
  animateOutline(element, 600)
}

function animateOutline(
  element: HTMLElement,
  duration: number,
  alpha = 0.9,
  outlineOffset = '-10px',
) {
  element.animate(
    [
      { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
      { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: `rgba(255,107,43,${alpha})`, outlineOffset },
      { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
    ],
    { duration, easing: 'ease-out' },
  )
}
