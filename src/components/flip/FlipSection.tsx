import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFlipControls } from './useFlipControls'

type AnimState = 'idle' | 'flip-to-back' | 'flip-to-front'

type Props = {
  id: string
  shape: string
  back?: ReactNode
  children: ReactNode
}

export function FlipSection({ id, shape, back, children }: Props) {
  const { toggle, isFlipped } = useFlipControls()
  const flipped = isFlipped(id)
  const [animState, setAnimState] = useState<AnimState>('idle')
  const prevFlipped = useRef(flipped)
  const cardRef = useRef<HTMLDivElement>(null)
  const canFlip = back != null

  useEffect(() => {
    if (!canFlip) return
    if (flipped === prevFlipped.current) return
    setAnimState(flipped ? 'flip-to-back' : 'flip-to-front')
    prevFlipped.current = flipped
  }, [flipped, canFlip])

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const handler = () => setAnimState('idle')
    el.addEventListener('animationend', handler)
    return () => el.removeEventListener('animationend', handler)
  }, [])

  return (
    <div style={{ perspective: '700px' }}>
      <div
        ref={cardRef}
        className="flip-card"
        data-state={flipped ? 'back' : 'front'}
        data-animating={animState !== 'idle' ? animState : undefined}
        style={{ clipPath: shape, background: '#0c0c0c', cursor: canFlip ? 'pointer' : '' }}
        onClick={canFlip ? () => toggle(id) : undefined}
      >
        <div className="flip-face-front">{children}</div>
        {back != null && <div className="flip-face-back">{back}</div>}
      </div>
    </div>
  )
}
