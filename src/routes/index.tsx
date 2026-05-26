import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '#/components/landing/Hero'
import { Context } from '#/components/landing/Context'
import { Partner } from '#/components/landing/Partner'
import { SystemChallenge } from '#/components/landing/SystemChallenge'
import { HowWeWork } from '#/components/landing/HowWeWork'
import { Philosophy } from '#/components/landing/Philosophy'
import { Examples } from '#/components/landing/Examples'
import { Closing } from '#/components/landing/Closing'

export const Route = createFileRoute('/')({ component: Landing })

function Landing() {
  return (
    <main>
      <Hero />
      <Context />
      <Partner />
      <SystemChallenge />
      <HowWeWork />
      <Philosophy />
      <Examples />
      <Closing />
    </main>
  )
}
