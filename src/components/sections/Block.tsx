import { useEffect, useRef } from 'react'
import type { SectionConfig, TabVariant } from './SectionContext'
import { streamFlashSpansIn } from '#/utils/streamFlash'

interface BlockProps {
  config: SectionConfig
  index: number
  prevTab: TabVariant
}

const CLIP_BOTTOM: Record<TabVariant, string> = {
  center: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), 64% calc(100% - 12px), 64% 100%, 36% 100%, 36% calc(100% - 12px), 0 calc(100% - 12px))',
  right:  'polygon(0 0, 100% 0, 100% calc(100% - 12px), 85% calc(100% - 12px), 85% 100%, 57% 100%, 57% calc(100% - 12px), 0 calc(100% - 12px))',
  left:   'polygon(0 0, 100% 0, 100% calc(100% - 12px), 43% calc(100% - 12px), 43% 100%, 15% 100%, 15% calc(100% - 12px), 0 calc(100% - 12px))',
  none:   '',
}

export function Block({ config, index, prevTab }: BlockProps) {
  const clipPath = CLIP_BOTTOM[config.tab] || undefined
  const marginTop = index === 0 || prevTab === 'none' ? 0 : -12
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) streamFlashSpansIn(contentRef.current)
  }, [config.content])

  return (
    <section
      id={config.id}
      data-theme={config.theme}
      data-tab={config.tab}
      className={`block-section${config.className ? ` ${config.className}` : ''}`}
      style={{ clipPath, marginTop, position: 'relative', zIndex: 1000 - index * 10 }}
    >
      {config.rule && <div className="block-rule" aria-hidden="true" />}
      {config.topic && <small className="block-topic">{config.topic}</small>}
      <div
        ref={contentRef}
        className="block-content"
        dangerouslySetInnerHTML={{ __html: config.content }}
      />
    </section>
  )
}
