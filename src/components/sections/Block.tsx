import { useEffect, useMemo, useRef, useState } from 'react'
import type { SectionConfig, TabVariant } from './SectionContext'
import { streamFlashSpansIn } from '#/utils/streamFlash'
import { useAnimatedHeight } from './useAnimatedHeight'
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
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (contentRef.current) streamFlashSpansIn(contentRef.current)
  }, [config.content])

  useAnimatedHeight(sectionRef, config.content)

  const hasDiagram = !!config.diagram
  const position = config.diagramPosition ?? 'after'

  return (
    <section
      ref={sectionRef}
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
  contentRef,
}: {
  config: SectionConfig
  contentRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="block-diagram-layout">
      <div className="w-full min-w-0">
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
      <div className="block-diagram-frame">
        {config.diagram && <DiagramCanvas data={config.diagram} />}
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
