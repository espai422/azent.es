import { AzentMark } from './AzentMark'
import { AzentWordmark } from './AzentWordmark'

interface AzentLogoProps {
  markSize?: number
  wordmarkSize?: number
  markColor?: string
  gap?: number
  orientation?: 'horizontal' | 'vertical'
}

export function AzentLogo({
  markSize = 26,
  wordmarkSize = 20,
  markColor = '#FF5A1F',
  gap = 10,
  orientation = 'horizontal',
}: AzentLogoProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        alignItems: 'center',
        gap,
      }}
    >
      <AzentMark size={markSize} color={markColor} />
      <AzentWordmark size={wordmarkSize} />
    </div>
  )
}
