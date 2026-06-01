import { createFileRoute } from '@tanstack/react-router'
import { BrowserToolBridge } from '#/components/BrowserToolBridge'
import { SectionProvider, useSections, Block } from '#/components/sections'
import { INITIAL_SECTIONS } from '#/content/landingSections'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  return (
    <SectionProvider initialSections={INITIAL_SECTIONS}>
      <BrowserToolBridge />
      <Landing />
    </SectionProvider>
  )
}

function Landing() {
  const { sections } = useSections()
  return (
    <main>
      {sections.map((config, index) => (
        <Block
          key={config.id}
          config={config}
          index={index}
          prevTab={index === 0 ? 'none' : sections[index - 1].tab}
        />
      ))}
    </main>
  )
}
