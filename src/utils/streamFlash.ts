export function streamFlashSpansIn(root: HTMLElement): void {
  const spans = root.querySelectorAll<HTMLSpanElement>(
    'span[data-flash]:not([data-streamed])',
  )
  spans.forEach(span => {
    span.setAttribute('data-streamed', '')
    const text = span.textContent ?? ''
    if (!text) return
    span.setAttribute('data-streaming', '')
    span.textContent = ''
    const tokens = tokenizeForStream(text)
    let i = 0
    const tick = () => {
      if (!span.isConnected) return
      if (i >= tokens.length) {
        span.removeAttribute('data-streaming')
        return
      }
      span.appendChild(span.ownerDocument.createTextNode(tokens[i]))
      i++
      window.setTimeout(tick, nextDelay())
    }
    window.setTimeout(tick, 0)
  })
}

function tokenizeForStream(text: string): string[] {
  const tokens: string[] = []
  const parts = text.match(/\s+|\S+/g) ?? []
  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      tokens.push(part)
      continue
    }
    let p = 0
    while (p < part.length) {
      const size = 1 + Math.floor(Math.random() * 4)
      tokens.push(part.slice(p, p + size))
      p += size
    }
  }
  return tokens
}

function nextDelay(): number {
  return 18 + Math.random() * 38
}
