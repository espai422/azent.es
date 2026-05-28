export function diffHtml(oldHtml: string, newHtml: string): string {
  const parser = new DOMParser()
  const oldDoc = parser.parseFromString(`<root>${oldHtml}</root>`, 'text/html')
  const newDoc = parser.parseFromString(`<root>${newHtml}</root>`, 'text/html')
  const oldRoot = oldDoc.body.firstChild as HTMLElement | null
  const newRoot = newDoc.body.firstChild as HTMLElement | null
  if (!newRoot) return newHtml
  walk(oldRoot, newRoot, newDoc)
  return newRoot.innerHTML
}

function walk(oldNode: Node | null, newNode: Node, doc: Document): void {
  if (newNode.nodeType === Node.TEXT_NODE) {
    if (oldNode && oldNode.nodeType === Node.TEXT_NODE) {
      diffTextNodes(oldNode as Text, newNode as Text, doc)
    } else {
      markAllTextAsNew(newNode, doc)
    }
    return
  }
  if (newNode.nodeType !== Node.ELEMENT_NODE) return

  const newEl = newNode as Element
  const oldEl = oldNode?.nodeType === Node.ELEMENT_NODE ? (oldNode as Element) : null
  if (!oldEl || oldEl.tagName !== newEl.tagName) {
    markAllTextAsNew(newEl, doc)
    return
  }

  const newChildren = Array.from(newEl.childNodes)
  const oldChildren = Array.from(oldEl.childNodes)
  for (let i = 0; i < newChildren.length; i++) {
    const match = oldChildren[i] && sameKind(oldChildren[i], newChildren[i]) ? oldChildren[i] : null
    walk(match, newChildren[i], doc)
  }
}

function sameKind(a: Node, b: Node): boolean {
  if (a.nodeType !== b.nodeType) return false
  if (a.nodeType === Node.ELEMENT_NODE) {
    return (a as Element).tagName === (b as Element).tagName
  }
  return true
}

function diffTextNodes(oldText: Text, newText: Text, doc: Document): void {
  const oldStr = oldText.nodeValue ?? ''
  const newStr = newText.nodeValue ?? ''
  if (oldStr === newStr) return

  const oldTokens = tokenize(oldStr)
  const newTokens = tokenize(newStr)
  const oldWords = oldTokens.filter(isWord)
  const newWords = newTokens.filter(isWord)
  const newWordKept = lcsMembership(oldWords, newWords)

  const annotated: Array<{ text: string; isNew: boolean }> = []
  let wordIdx = 0
  for (const tok of newTokens) {
    if (isWord(tok)) {
      annotated.push({ text: tok, isNew: !newWordKept[wordIdx++] })
    } else {
      annotated.push({ text: tok, isNew: false })
    }
  }

  for (let i = 0; i < annotated.length; i++) {
    if (!isWord(annotated[i].text)) {
      const prev = annotated[i - 1]
      const next = annotated[i + 1]
      if (prev?.isNew && next?.isNew) annotated[i].isNew = true
    }
  }

  if (annotated.every(t => !t.isNew)) return

  const frag = doc.createDocumentFragment()
  let span: HTMLSpanElement | null = null
  for (const tok of annotated) {
    if (tok.isNew) {
      if (!span) {
        span = doc.createElement('span')
        span.setAttribute('data-flash', '')
      }
      span.appendChild(doc.createTextNode(tok.text))
    } else {
      if (span) { frag.appendChild(span); span = null }
      frag.appendChild(doc.createTextNode(tok.text))
    }
  }
  if (span) frag.appendChild(span)
  newText.parentNode?.replaceChild(frag, newText)
}

function tokenize(s: string): string[] {
  return s.match(/\S+|\s+/g) ?? []
}

function isWord(tok: string): boolean {
  return /\S/.test(tok)
}

function lcsMembership(oldArr: string[], newArr: string[]): boolean[] {
  const m = oldArr.length, n = newArr.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldArr[i - 1] === newArr[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const kept = new Array(n).fill(false)
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (oldArr[i - 1] === newArr[j - 1]) {
      kept[j - 1] = true
      i--; j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  return kept
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
