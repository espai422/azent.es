import { useEffect, useMemo, useRef, useState } from 'react'
import type { SectionConfig, TabVariant } from './SectionContext'
import { streamFlashSpansIn } from '#/utils/streamFlash'
import { DiagramCanvas } from './diagram/DiagramCanvas'
import { DiagramVariables } from './diagram/DiagramVariables'
import { DiagramCalculo } from './diagram/DiagramCalculo'
import { evaluate } from './diagram/formulaUtils'

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

  const hasDiagram = !!config.diagram
  const position = config.diagramPosition ?? 'after'

  return (
    <section
      id={config.id}
      data-theme={config.theme}
      data-tab={config.tab}
      data-diagram-position={hasDiagram ? position : undefined}
      className={`block-section${config.className ? ` ${config.className}` : ''}`}
      style={{ clipPath, marginTop, position: 'relative', zIndex: 1000 - index * 10 }}
    >
      {config.rule && <div className="block-rule" aria-hidden="true" />}
      {config.topic && <small className="block-topic">{config.topic}</small>}

      {hasDiagram ? (
        <SplitLayout
          config={config}
          position={position}
          contentRef={contentRef}
        />
      ) : (
        <div
          ref={contentRef}
          className="block-content"
          dangerouslySetInnerHTML={{ __html: config.content }}
        />
      )}
    </section>
  )
}

function SplitLayout({
  config,
  position,
  contentRef,
}: {
  config: SectionConfig
  position: 'before' | 'after'
  contentRef: React.RefObject<HTMLDivElement | null>
}) {
  const diagramOrderClass = position === 'before' ? 'md:order-1' : 'md:order-2'
  const textOrderClass = position === 'before' ? 'md:order-2' : 'md:order-1'
  const mobileOrderDiagram = position === 'before' ? 'order-1' : 'order-2'
  const mobileOrderText = position === 'before' ? 'order-2' : 'order-1'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
      <div className={`${mobileOrderDiagram} ${diagramOrderClass} w-full`}>
        {config.diagram && <DiagramCanvas data={config.diagram} />}
      </div>
      <div className={`${mobileOrderText} ${textOrderClass} w-full min-w-0`}>
        <div
          ref={contentRef}
          className="block-content"
          dangerouslySetInnerHTML={{ __html: config.content }}
        />
        {config.formula && (
          <FormulaPanel
            formula={config.formula}
            baselineVariables={config.variables ?? {}}
          />
        )}
      </div>
    </div>
  )
}

function FormulaPanel({
  formula,
  baselineVariables,
}: {
  formula: string
  baselineVariables: Record<string, number>
}) {
  const [localVars, setLocalVars] = useState(baselineVariables)

  useEffect(() => {
    setLocalVars(baselineVariables)
  }, [baselineVariables])

  const result = useMemo(() => evaluate(formula, localVars), [formula, localVars])

  function handleChange(name: string, value: number) {
    setLocalVars((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="mt-6 pt-6 border-t border-[var(--prose-grid-gap)]">
      <DiagramVariables variables={localVars} onChange={handleChange} />
      <DiagramCalculo formula={formula} result={result} />
    </div>
  )
}
