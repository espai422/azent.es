export function Partner() {
  return (
    <section className="border-t border-neutral-900 px-6 py-24 md:px-16">
      <div className="grid max-w-5xl gap-12 md:grid-cols-[180px_1fr]">
        <div className="pt-1">
          <span className="text-xs font-medium uppercase tracking-widest text-neutral-600">
            Partner
          </span>
        </div>
        <div>
          <h2 className="mb-6 text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
            Nos involucramos como si fuera nuestro negocio
          </h2>
          <p className="leading-relaxed text-neutral-400">
            La diferencia entre una agencia y un partner técnico real es que uno ejecuta
            lo que se le pide y el otro pregunta si lo que se pide es lo correcto.
            Nosotros preguntamos. Entendemos la empresa, sus procesos, sus objetivos.
            Proponemos lo que tiene sentido, aunque no sea lo más obvio. Y cuando algo
            no funciona, lo decimos.
          </p>
        </div>
      </div>
    </section>
  )
}
