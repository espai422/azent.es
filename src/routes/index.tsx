import { createFileRoute } from '@tanstack/react-router'
import { FlipProvider } from '#/components/flip/FlipProvider'
import { FlipSection } from '#/components/flip/FlipSection'
import { PolygonSection } from '#/components/flip/PolygonSection'
import { Hero } from '#/components/landing/Hero'
import { Context } from '#/components/landing/Context'
import { ContextBack } from '#/components/landing/ContextBack'
import { Partner } from '#/components/landing/Partner'
import { PartnerBack } from '#/components/landing/PartnerBack'
import { SystemChallenge } from '#/components/landing/SystemChallenge'
import { SystemChallengeBack } from '#/components/landing/SystemChallengeBack'
import { HowWeWork } from '#/components/landing/HowWeWork'
import { HowWeWorkBack } from '#/components/landing/HowWeWorkBack'
import { Philosophy } from '#/components/landing/Philosophy'
import { PhilosophyBack } from '#/components/landing/PhilosophyBack'
import { Examples } from '#/components/landing/Examples'
import { Closing } from '#/components/landing/Closing'

export const Route = createFileRoute('/')({ component: Landing })

function Landing() {
  return (
    <FlipProvider>
      <main>
        <PolygonSection shape="polygon(0% 0%, 100% 0%, 100% 92%, 5% 100%)">
          <Hero />
        </PolygonSection>

        <FlipSection
          id="context"
          shape="polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)"
          back={<ContextBack />}
        >
          <Context />
        </FlipSection>

        <FlipSection
          id="partner"
          shape="polygon(4% 0%, 100% 0%, 100% 88%, 0% 100%)"
          back={<PartnerBack />}
        >
          <Partner />
        </FlipSection>

        <FlipSection
          id="systemChallenge"
          shape="polygon(0% 0%, 96% 0%, 100% 100%, 6% 100%)"
          back={<SystemChallengeBack />}
        >
          <SystemChallenge />
        </FlipSection>

        <FlipSection
          id="howWeWork"
          shape="polygon(0% 6%, 100% 0%, 100% 94%, 0% 100%)"
          back={<HowWeWorkBack />}
        >
          <HowWeWork />
        </FlipSection>

        <FlipSection
          id="philosophy"
          shape="polygon(0% 0%, 100% 0%, 94% 100%, 6% 100%)"
          back={<PhilosophyBack />}
        >
          <Philosophy />
        </FlipSection>

        <PolygonSection shape="polygon(6% 0%, 100% 0%, 100% 100%, 0% 100%)">
          <Examples />
        </PolygonSection>

        <PolygonSection shape="polygon(0% 8%, 100% 0%, 100% 100%, 0% 100%)">
          <Closing />
        </PolygonSection>
      </main>
    </FlipProvider>
  )
}
