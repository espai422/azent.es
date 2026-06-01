import type { SectionInput } from '#/components/sections'

export const INITIAL_SECTIONS: SectionInput[] = [
  {
    id: 'intro',
    theme: 'dark-1',
    tab: 'center',
    className: 'flex flex-col justify-end min-h-[70vh] md:min-h-[85vh]',
    content: `
      <div class="hero-composition">
        <div class="hero-copy">
          <small>AZENT / Partner técnico</small>
          <h1>No hacemos software. Transformamos cómo opera tu empresa.</h1>
          <p class="lead">Desarrollo de software e inteligencia artificial aplicada al negocio real.
          Nos sentamos contigo, entendemos qué frena el crecimiento y construimos
          los sistemas que lo desbloquean, con o sin IA, según lo que tiene sentido.</p>
        </div>
        <div class="proof-rail" aria-label="Principios de trabajo">
          <span>Diagnóstico antes que ejecución</span>
          <span>IA solo donde aporta valor</span>
          <span>Sistemas a medida del negocio</span>
        </div>
      </div>
    `,
  },
  {
    id: 'antes-y-despues-ia',
    rule: true,
    content: `
      <div class="section-grid section-grid--wide">
        <div>
          <h2>Hay un <span class="accent">antes y un después</span> de la IA. Pocas empresas han cruzado esa línea.</h2>
          <p>No porque la tecnología no esté disponible. Sino porque aplicarla bien requiere
          entender a fondo el negocio, los procesos y los límites reales de la IA, y eso
          no viene en ningún SaaS genérico.</p>
        </div>
        <aside class="thesis-panel">
          <span class="panel-index">01</span>
          <p>El mercado vende atajos.</p>
          <strong>Los atajos no transforman nada.</strong>
        </aside>
      </div>
    `,
  },
  {
    id: 'partner-tecnico',
    content: `
      <div class="section-grid">
        <div>
          <small>Partner</small>
          <h2>Nos involucramos como si fuera nuestro negocio</h2>
          <p>La diferencia entre una agencia y un partner técnico real es que uno ejecuta
          lo que se le pide y el otro pregunta si lo que se pide es lo correcto.</p>
        </div>
        <div class="decision-list" aria-label="Cómo trabajamos">
          <div>
            <span>Preguntamos</span>
            <p>Antes de construir, entendemos la empresa, sus procesos y sus objetivos.</p>
          </div>
          <div>
            <span>Proponemos</span>
            <p>Lo que tiene sentido, aunque no sea lo más obvio.</p>
          </div>
          <div>
            <span>Decimos no</span>
            <p>Cuando algo no funciona, lo decimos.</p>
          </div>
        </div>
      </div>
    `,
  },
  {
    id: 'cuestionamos-sistema',
    content: `
      <div class="question-layout">
        <div>
          <h2>Cuestionamos el <span class="accent">sistema</span></h2>
          <p>La IA no mejora procesos rotos. Los reemplaza. Automatizar algo ineficiente solo
          lo hace ineficiente más rápido.</p>
          <p class="outcome-note">Si la respuesta es no, lo tiramos y empezamos de cero. El resultado no es lo de
          siempre más barato: es algo que antes directamente no era posible.</p>
        </div>
        <div class="quote-switch" aria-label="Cambio de enfoque">
          <p><span>Enfoque típico</span>"¿Cómo automatizamos esto?"</p>
          <p><span>Nuestro punto de partida</span>"¿Tiene sentido que esto exista?"</p>
        </div>
      </div>
    `,
  },
  {
    id: 'software-e-ia',
    rule: true,
    content: `
      <div class="section-grid section-grid--wide">
        <div>
          <small>El cómo</small>
          <h2>Software e IA, sin separación artificial</h2>
          <p>No hacemos "proyectos de IA" por un lado y "proyectos de software" por otro.
          Para nosotros es lo mismo: crear soluciones. Lo que importa no es la
          tecnología que hay debajo, es que el sistema resuelva el problema real.</p>
        </div>
        <div class="capability-stack">
          <article>
            <span>Cuando la IA aporta valor</span>
            <p>La integramos con la profundidad que requiere cada caso: desde una integración puntual hasta sistemas que razonan y actúan de forma autónoma.</p>
          </article>
          <article>
            <span>Cuando no hace falta</span>
            <p>Construimos con desarrollo tradicional apoyado en IA para mover más rápido y a menor coste sin sacrificar calidad.</p>
          </article>
          <article>
            <span>En cualquier caso</span>
            <p>Sistemas que analizan, deciden, actúan y comunican. Arquitectura que escala con el negocio y devuelve tiempo al equipo.</p>
          </article>
        </div>
      </div>
    `,
  },
  {
    id: 'pragmaticos',
    content: `
      <div class="pragmatic-band">
        <div>
          <h2>Pragmáticos <span class="accent">por encima</span> de todo</h2>
          <p>El mercado de la IA está lleno de promesas que no sobreviven al contacto
          con la realidad. Nosotros operamos al revés: entendemos bien qué puede hacer
          la IA hoy, y qué no puede.</p>
          <p class="outcome-note">Desde ahí encontramos las soluciones más creativas y útiles.</p>
        </div>
        <div class="principle-strip" aria-label="Principios de pragmatismo">
          <span>Sin burocracia innecesaria</span>
          <span>Sin procesos para justificarse</span>
          <span>Foco total en impacto real</span>
        </div>
      </div>
    `,
  },
  {
    id: 'cierre-pregunta',
    theme: 'closing',
    pinned: true,
    content: `
      <div class="closing-ledger">
        <div class="ledger-intro">
          <small>Coste invisible</small>
          <p>La pregunta no es si tu empresa puede mejorar con IA. Es cuánto estás dejando
          sobre la mesa cada día que no lo hace.</p>
        </div>
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
            <span class="block-stat">...</span>
            <p><strong>El tuyo aquí</strong></p>
            <p>Cada empresa tiene un proceso que no tiene sentido en un mundo con IA.</p>
          </div>
        </div>
      </div>
    `,
  },
  {
    id: 'cierre-final',
    theme: 'closing',
    pinned: true,
    content: `
      <div class="final-statement">
        <span>AZENT</span>
        <p>No buscamos clientes. Buscamos empresas que quieran operar diferente.</p>
      </div>
    `,
  },
]
