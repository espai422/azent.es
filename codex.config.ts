/**
 * Modelo del agente Codex usado al arrancar threads desde el servidor.
 *
 * Descomenta UNO sólo. Si todos están comentados (o vale `undefined`),
 * se usa el modelo por defecto de la CLI de Codex (actualmente gpt-5.4).
 */
export const CODEX_MODEL: string | undefined =
  // undefined // ← default actual: lo que decida la CLI de Codex (hoy: gpt-5.4)

  // ─── GPT-5.x ──────────────────────────────────────────────────────────────
  'gpt-5.5'            // último flagship agéntico de coding
  // 'gpt-5.4'            // default actual de la CLI; muy capaz, buen coste
  // 'gpt-5.4-mini'       // más barato, workflows ligeros y testing
  // 'gpt-5.4-nano'       // máxima velocidad, tareas simples / clasificación
  // 'gpt-5.3-codex'      // coding agéntico (familia codex previa)
  // 'gpt-5.2'            // gpt-5 anterior
  // 'gpt-5.1-codex-mini' // workflows de coding más baratos

  // ─── GPT-4.1 (sin razonamiento) ───────────────────────────────────────────
  // 'gpt-4.1-mini'       // texto barato sin razonamiento
  // 'gpt-4.1-nano'       // el más rápido y barato sin razonamiento

/**
 * Esfuerzo de razonamiento. Solo aplica a modelos con razonamiento (gpt-5.x).
 * Déjalo en undefined para usar el default del modelo.
 */
export const CODEX_MODEL_REASONING_EFFORT:
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | undefined = 'low'
