const EXAMPLES = [
  {
    metric: 'XX h/semana',
    title: 'Onboarding de clientes automatizado',
    description: 'Sin emails manuales, sin formularios, sin seguimiento a mano.',
  },
  {
    metric: '€XX k/año',
    title: 'Procesado de documentos y contratos',
    description: 'Lo que cuesta un perfil administrativo haciendo tareas que un sistema puede hacer.',
  },
  {
    metric: 'XX%',
    title: 'Reducción de tiempo en reporting',
    description: 'Dashboards y análisis que antes costaban horas, generados en segundos.',
  },
  {
    metric: '···',
    title: 'El tuyo aquí',
    description: 'Cada empresa tiene un proceso que no tiene sentido en un mundo con IA.',
  },
]

export function Examples() {
  return (
    <section className="border-t border-neutral-900 px-6 py-24 md:px-16">
      <p className="mb-16 max-w-3xl text-2xl font-semibold leading-snug tracking-tight md:text-4xl">
        La pregunta no es si tu empresa puede mejorar con IA. Es cuánto estás dejando
        sobre la mesa cada día que no lo hace.
      </p>
      <div className="grid grid-cols-1 gap-px bg-neutral-900 md:grid-cols-2">
        {EXAMPLES.map((example) => (
          <article key={example.title} className="bg-black px-8 py-10">
            <p className="mb-2 text-3xl font-semibold tabular-nums md:text-4xl">
              {example.metric}
            </p>
            <p className="mb-2 font-medium">{example.title}</p>
            <p className="text-sm leading-relaxed text-neutral-500">{example.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
