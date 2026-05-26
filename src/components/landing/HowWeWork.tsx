export function HowWeWork() {
  return (
    <section className="border-t border-neutral-900 px-6 py-24 md:px-16">
      <div className="grid max-w-5xl gap-12 md:grid-cols-[180px_1fr]">
        <div className="pt-1">
          <span className="text-xs font-medium uppercase tracking-widest text-neutral-600">
            El cómo
          </span>
        </div>
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
            Software e IA, sin separación artificial
          </h2>
          <p className="leading-relaxed text-neutral-400">
            No hacemos "proyectos de IA" por un lado y "proyectos de software" por otro.
            Para nosotros es lo mismo: crear soluciones. Lo que importa no es la
            tecnología que hay debajo — es que el sistema resuelva el problema real.
          </p>
          <p className="leading-relaxed text-neutral-400">
            Cuando la IA aporta valor, la integramos con la profundidad que requiere
            cada caso — desde una integración puntual hasta sistemas que razonan y
            actúan de forma autónoma. Cuando no hace falta, construimos con desarrollo
            tradicional apoyado en IA, lo que nos permite mover más rápido y a menor
            coste que la competencia sin sacrificar calidad.
          </p>
          <p className="leading-relaxed text-neutral-400">
            El resultado, en cualquier caso, son sistemas que hacen cosas que antes
            requerían personas: analizar, decidir, actuar, comunicar. Arquitectura que
            escala con el negocio y devuelve tiempo al equipo para invertirlo en lo que
            realmente importa.
          </p>
        </div>
      </div>
    </section>
  )
}
