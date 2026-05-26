# Landing Page — Diseño y Copy

**Fecha:** 2026-05-27  
**Idioma:** Español  
**Formato:** Manifiesto lineal (una columna, scroll editorial)  
**Tono:** Técnico y autoritario, sin adornos  
**CTA:** Ninguno por ahora (se añadirá cuando la página incorpore elementos interactivos)  
**Social proof:** No incluido en esta versión  

---

## Audiencia

Mix: propietario/CEO, responsable de operaciones, perfil técnico. El mensaje debe funcionar para todos sin estar optimizado para ninguno en particular. El texto técnico y directo actúa como filtro natural hacia el perfil que encaja con AZENT.

---

## Estructura y copy

### 01 — Hero

**Título:**  
No hacemos software. Transformamos cómo opera tu empresa.

**Cuerpo:**  
Desarrollo de software e inteligencia artificial aplicada al negocio real. Nos sentamos contigo, entendemos qué frena el crecimiento y construimos los sistemas que lo desbloquean — con o sin IA, según lo que tiene sentido.

---

### 02 — El contexto

**Título:**  
Hay un antes y un después de la IA. Pocas empresas han cruzado esa línea.

**Cuerpo:**  
No porque la tecnología no esté disponible. Sino porque aplicarla bien requiere entender a fondo el negocio, los procesos y los límites reales de la IA — y eso no viene en ningún SaaS genérico. El mercado vende atajos. Los atajos no transforman nada.

---

### 03 — Partner, no proveedor

**Título:**  
Nos involucramos como si fuera nuestro negocio

**Cuerpo:**  
La diferencia entre una agencia y un partner técnico real es que uno ejecuta lo que se le pide y el otro pregunta si lo que se pide es lo correcto. Nosotros preguntamos. Entendemos la empresa, sus procesos, sus objetivos. Proponemos lo que tiene sentido, aunque no sea lo más obvio. Y cuando algo no funciona, lo decimos.

---

### 04 — Cuestionamos el sistema

**Título:**  
Cuestionamos el sistema

**Cuerpo:**  
La IA no mejora procesos rotos. Los reemplaza. Automatizar algo ineficiente solo lo hace ineficiente más rápido. Por eso nuestro punto de partida nunca es "¿cómo automatizamos esto?" sino "¿tiene sentido que esto exista?". Si la respuesta es no, lo tiramos y empezamos de cero. El resultado no es lo de siempre más barato — es algo que antes directamente no era posible.

---

### 05 — El cómo: software + IA

**Título:**  
Software e IA, sin separación artificial

**Cuerpo:**  
No hacemos "proyectos de IA" por un lado y "proyectos de software" por otro. Para nosotros es lo mismo: crear soluciones. Lo que importa no es la tecnología que hay debajo — es que el sistema resuelva el problema real.

Cuando la IA aporta valor, la integramos con la profundidad que requiere cada caso — desde una integración puntual hasta sistemas que razonan y actúan de forma autónoma. Cuando no hace falta, construimos con desarrollo tradicional apoyado en IA, lo que nos permite mover más rápido y a menor coste que la competencia sin sacrificar calidad.

El resultado, en cualquier caso, son sistemas que hacen cosas que antes requerían personas: analizar, decidir, actuar, comunicar. Arquitectura que escala con el negocio y devuelve tiempo al equipo para invertirlo en lo que realmente importa.

---

### 06 — Filosofía / Anti-hype

**Título:**  
Pragmáticos por encima de todo

**Cuerpo:**  
El mercado de la IA está lleno de promesas que no sobreviven al contacto con la realidad. Nosotros operamos al revés: entendemos bien qué puede hacer la IA hoy — y qué no puede — y desde ahí encontramos las soluciones más creativas y útiles. Sin burocracia innecesaria, sin procesos que existen para justificarse a sí mismos. Foco total en crear impacto real.

---

### 07 — Intro a ejemplos

**Texto (encabeza el bloque de ejemplos, sin separación visual entre este texto y las tarjetas):**  
La pregunta no es si tu empresa puede mejorar con IA. Es cuánto estás dejando sobre la mesa cada día que no lo hace.

---

### 08 — Ejemplos con impacto (WIP)

**Formato:** Tarjetas en grid 2×N. Cada tarjeta tiene:
- Número destacado (horas, euros, porcentaje)
- Título del caso
- Descripción breve de lo que se automatiza/construye

**Estado:** Placeholders. Los casos concretos y los números reales los define el equipo de AZENT en una iteración futura. Cuanto más específicos y verificables, mayor el impacto.

**Ejemplos orientativos (a sustituir):**
- XX h/semana — Onboarding de clientes automatizado
- €XX k/año — Procesado de documentos y contratos
- XX% — Reducción de tiempo en reporting interno

---

### Cierre final

**Texto secundario (bajo las tarjetas, tipografía pequeña y atenuada):**  
No buscamos clientes. Buscamos empresas que quieran operar diferente.

---

## Decisiones de diseño

- **Sin CTA explícito** en esta versión. La landing es un manifiesto de posicionamiento. Los elementos interactivos y la conversión se añadirán en iteraciones posteriores.
- **Bloque 07 y 08 visualmente conectados**: el texto intro y las tarjetas forman un único bloque sin separación visual clara, para que el "cuánto estás dejando" fluya directamente hacia los números.
- **Ejemplos en formato tarjeta** con número grande como elemento de shock visual. Los números son el remate concreto del argumento abstracto anterior.
- **Paleta:** oscura (consistente con el estilo actual del proyecto: negro/blanco/grises).
- **Tipografía:** añadir una fuente externa de calidad (ej. Geist, Inter o similar). Una sola familia, bien configurada en `styles.css`.

## Filosofía de implementación (importante)

El objetivo es construir una **maqueta estructuralmente sólida**, no una página terminada visualmente. Esto significa:

- **Tailwind solo para layout**: espaciado, tipografía, grid. Sin colores decorativos, sombras, bordes ornamentales ni efectos visuales que luego haya que deshacer.
- **Layouts variados por sección**: no todas las secciones son una columna de texto centrada. Cada sección tiene su propio tratamiento espacial para crear jerarquía visual y ritmo de scroll. Ejemplos:
  - Hero: tipo grande, padding generoso, ocupa gran parte del viewport
  - Cuestionamos el sistema: puede justificarse a izquierda con más anchura, o con el título en una columna y el cuerpo en otra
  - Ejemplos: grid de tarjetas (2 columnas en desktop, 1 en móvil)
  - Cierre: tipografía pequeña, mucho espacio en blanco, centrado
- **Componentizado**: cada sección es un componente React independiente. La ruta `index.tsx` los compone.
- **Style-ready**: la estructura HTML y las clases de layout deben ser las definitivas. Cuando se aplique el design system, solo se añaden clases de color, tipografía avanzada y efectos — no se reestructura el HTML.
- **Sin relleno**: no se añaden elementos decorativos (líneas, iconos, separadores) que no estén justificados por el contenido.

## Lo que esta landing NO incluye (deliberadamente)

- Logos de clientes o casos de éxito
- Formulario de contacto o CTA de reserva de llamada
- Sección de precios
- Equipo o "sobre nosotros"
- Testimonios
