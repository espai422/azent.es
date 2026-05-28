import { createFileRoute } from '@tanstack/react-router'
import { BrowserToolBridge } from '#/components/BrowserToolBridge'
import { SectionProvider, useSections, Block } from '#/components/sections'
import type { SectionInput } from '#/components/sections'

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

const INITIAL_SECTIONS: SectionInput[] = [
  {
    theme: 'dark-1',
    tab: 'center',
    className: 'flex flex-col justify-end min-h-[70vh] md:min-h-[85vh]',
    content: `
      <h1>No hacemos software. Transformamos cómo opera tu empresa.</h1>
      <p>Desarrollo de software e inteligencia artificial aplicada al negocio real.
      Nos sentamos contigo, entendemos qué frena el crecimiento y construimos
      los sistemas que lo desbloquean — con o sin IA, según lo que tiene sentido.</p>
    `,
  },
  {
    rule: true,
    content: `
      <h2>Hay un <span class="accent">antes y un después</span> de la IA. Pocas empresas han cruzado esa línea.</h2>
      <p>No porque la tecnología no esté disponible. Sino porque aplicarla bien requiere
      entender a fondo el negocio, los procesos y los límites reales de la IA — y eso
      no viene en ningún SaaS genérico. El mercado vende atajos. Los atajos no
      transforman nada.</p>
    `,
  },
  {
    content: `
      <small>Partner</small>
      <h2>Nos involucramos como si fuera nuestro negocio</h2>
      <p>La diferencia entre una agencia y un partner técnico real es que uno ejecuta
      lo que se le pide y el otro pregunta si lo que se pide es lo correcto.
      Nosotros preguntamos. Entendemos la empresa, sus procesos, sus objetivos.
      Proponemos lo que tiene sentido, aunque no sea lo más obvio. Y cuando algo
      no funciona, lo decimos.</p>
    `,
  },
  {
    content: `
      <h2>Cuestionamos el <span class="accent">sistema</span></h2>
      <p>La IA no mejora procesos rotos. Los reemplaza. Automatizar algo ineficiente solo
      lo hace ineficiente más rápido. Por eso nuestro punto de partida nunca es
      "¿cómo automatizamos esto?" sino "¿tiene sentido que esto exista?". Si la
      respuesta es no, lo tiramos y empezamos de cero. El resultado no es lo de
      siempre más barato — es algo que antes directamente no era posible.</p>
    `,
  },
  {
    rule: true,
    content: `
      <small>El cómo</small>
      <h2>Software e IA, sin separación artificial</h2>
      <p>No hacemos "proyectos de IA" por un lado y "proyectos de software" por otro.
      Para nosotros es lo mismo: crear soluciones. Lo que importa no es la
      tecnología que hay debajo — es que el sistema resuelva el problema real.</p>
      <p>Cuando la IA aporta valor, la integramos con la profundidad que requiere
      cada caso — desde una integración puntual hasta sistemas que razonan y
      actúan de forma autónoma. Cuando no hace falta, construimos con desarrollo
      tradicional apoyado en IA, lo que nos permite mover más rápido y a menor
      coste que la competencia sin sacrificar calidad.</p>
      <p>El resultado, en cualquier caso, son sistemas que hacen cosas que antes
      requerían personas: analizar, decidir, actuar, comunicar. Arquitectura que
      escala con el negocio y devuelve tiempo al equipo para invertirlo en lo que
      realmente importa.</p>
    `,
  },
  {
    content: `
      <h2>Pragmáticos <span class="accent">por encima</span> de todo</h2>
      <p>El mercado de la IA está lleno de promesas que no sobreviven al contacto
      con la realidad. Nosotros operamos al revés: entendemos bien qué puede hacer
      la IA hoy — y qué no puede — y desde ahí encontramos las soluciones más
      creativas y útiles. Sin burocracia innecesaria, sin procesos que existen para
      justificarse a sí mismos. Foco total en crear impacto real.</p>
    `,
  },
  {
    theme: 'closing',
    content: `
      <p>La pregunta no es si tu empresa puede mejorar con IA. Es cuánto estás dejando
      sobre la mesa cada día que no lo hace.</p>
      <div class="block-cards">
        <div class="block-card">
          <span class="block-stat">XX h/semana</span>
          <p><strong>Onboarding de clientes automatizado</strong></p>
          <p>Sin emails manuales, sin formularios, sin seguimiento a mano.</p>
        </div>
        <div class="block-card">
          <span class="block-stat">€XX k/año</span>
          <p><strong>Procesado de documentos y contratos</strong></p>
          <p>Lo que cuesta un perfil administrativo haciendo tareas que un sistema puede hacer.</p>
        </div>
        <div class="block-card">
          <span class="block-stat">XX%</span>
          <p><strong>Reducción de tiempo en reporting</strong></p>
          <p>Dashboards y análisis que antes costaban horas, generados en segundos.</p>
        </div>
        <div class="block-card">
          <span class="block-stat">···</span>
          <p><strong>El tuyo aquí</strong></p>
          <p>Cada empresa tiene un proceso que no tiene sentido en un mundo con IA.</p>
        </div>
      </div>
    `,
  },
  {
    content: `<p>No buscamos clientes. Buscamos empresas que quieran operar diferente.</p>`,
  },
]
