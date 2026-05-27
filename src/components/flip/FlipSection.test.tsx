import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { FlipProvider } from '#/components/flip/FlipProvider'
import { FlipSection } from '#/components/flip/FlipSection'

const SHAPE = 'polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)'

function Wrap({ children }: { children: ReactNode }) {
  return <FlipProvider>{children}</FlipProvider>
}

function card() {
  return document.querySelector('[data-state]') as HTMLElement
}

describe('FlipSection', () => {
  it('renders front children', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE} back={<p>back</p>}><p>front</p></FlipSection></Wrap>)
    expect(screen.getByText('front')).toBeDefined()
  })

  it('renders back content', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE} back={<p>back content</p>}><p>front</p></FlipSection></Wrap>)
    expect(screen.getByText('back content')).toBeDefined()
  })

  it('with back: pointer cursor and sets data-animating on click', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE} back={<p>back</p>}><p>front</p></FlipSection></Wrap>)
    const c = card()
    expect(c.style.cursor).toBe('pointer')
    fireEvent.click(c)
    expect(c.getAttribute('data-animating')).toBe('flip-to-back')
  })

  it('with back: second click while back-state sets data-animating to flip-to-front', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE} back={<p>back</p>}><p>front</p></FlipSection></Wrap>)
    const c = card()
    fireEvent.click(c)
    fireEvent(c, new Event('animationend'))
    expect(c.getAttribute('data-animating')).toBeNull()
    fireEvent.click(c)
    expect(c.getAttribute('data-animating')).toBe('flip-to-front')
  })

  it('without back: no pointer cursor, click does not set data-animating', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE}><p>front</p></FlipSection></Wrap>)
    const c = card()
    expect(c.style.cursor).toBe('')
    fireEvent.click(c)
    expect(c.getAttribute('data-animating')).toBeNull()
  })

  it('animationend clears data-animating', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE} back={<p>back</p>}><p>front</p></FlipSection></Wrap>)
    const c = card()
    fireEvent.click(c)
    expect(c.getAttribute('data-animating')).toBe('flip-to-back')
    fireEvent(c, new Event('animationend'))
    expect(c.getAttribute('data-animating')).toBeNull()
  })
})
