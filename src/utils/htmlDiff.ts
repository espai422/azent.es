export function diffHtml(oldHtml: string, newHtml: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<root>${newHtml}</root>`, 'text/html')
  const newRoot = doc.body.firstChild as HTMLElement
  if (!newRoot) return newHtml

  if (oldHtml === '') {
    markAllTextAsNew(newRoot, doc)
  }

  return newRoot.innerHTML
}

function markAllTextAsNew(node: Node, doc: Document): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? ''
    if (!/\S/.test(text)) return
    const span = doc.createElement('span')
    span.setAttribute('data-flash', '')
    span.appendChild(doc.createTextNode(text))
    node.parentNode?.replaceChild(span, node)
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  for (const child of Array.from(node.childNodes)) {
    markAllTextAsNew(child, doc)
  }
}
