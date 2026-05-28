# HTML Diff Flash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a text-level HTML diff to `set_block_html` so newly added or modified text fragments are highlighted with an orange flash (~1s) before fading back to normal, making it obvious to the user what just changed in a block.

**Architecture:** A pure function `diffHtml(oldHtml, newHtml)` parses both into DOM trees in memory, walks them in parallel matching children with two-phase LCS (first by `tag + text snippet` signature, then position-pair leftover same-tag children), word-diffs matched text nodes, and wraps new fragments in `<span data-flash>…</span>`. A CSS keyframe animation drives the flash on mount. The function is wired into the `set_block_html` browser tool handler.

**Tech Stack:** TypeScript, vitest + jsdom for tests, DOMParser API (browser/jsdom), Tailwind v4 with raw CSS keyframes.

**Spec reference:** `docs/superpowers/specs/2026-05-29-html-diff-flash-design.md`

---

## File Structure

- **Create** `src/utils/htmlDiff.ts` — pure module exporting `diffHtml(oldHtml, newHtml): string`. Holds the parser/walker/LCS/word-diff logic. ~150 lines.
- **Create** `src/utils/htmlDiff.test.ts` — vitest tests, ~11 cases covering empty, identical, append, insert, move, word change, multi-word, nested, subtree-new, tag change, stale-marker stripping.
- **Modify** `src/styles.css` — add `@keyframes diff-flash` and `.block-content [data-flash]` rule.
- **Modify** `src/components/BrowserToolBridge.tsx` — call `diffHtml` inside the `set_block_html` handler before `updateSection`.

---

## Task 1: Module skeleton + empty-old case

**Files:**
- Create: `src/utils/htmlDiff.ts`
- Create: `src/utils/htmlDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/htmlDiff.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { diffHtml } from './htmlDiff'

describe('diffHtml', () => {
  it('wraps all text as new when old is empty', () => {
    const result = diffHtml('', '<p>hello</p>')
    expect(result).toBe('<p><span data-flash="">hello</span></p>')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: FAIL with "Cannot find module './htmlDiff'" or similar import error.

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/htmlDiff.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/utils/htmlDiff.ts src/utils/htmlDiff.test.ts
git commit -m "feat(htmlDiff): wrap all text as new when old html is empty"
```

---

## Task 2: Identical content → no spans

**Files:**
- Modify: `src/utils/htmlDiff.ts`
- Modify: `src/utils/htmlDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/htmlDiff.test.ts` inside the `describe` block:

```typescript
  it('produces no spans when content is identical', () => {
    const result = diffHtml('<p>same</p>', '<p>same</p>')
    expect(result).toBe('<p>same</p>')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: FAIL — the new test fails because the non-empty-old branch is not implemented and current code returns `newRoot.innerHTML` unchanged… actually that would PASS by accident. To force a real red, we'll temporarily make it deliberate: add a `console.log` is not necessary — the test should already pass here because the empty-old branch is gated. Move on to step 3 only if PASS.

If PASS on step 2, skip step 3 (the test guards the behavior we already have) and go to step 4.

Note: TDD purists may dislike a green-on-first-run test. It's intentional here — this test pins behavior we want to preserve as we evolve the walker in Task 3+.

- [ ] **Step 3: (Skipped if step 2 passes — placeholder for evolution)**

No implementation change needed at this point.

- [ ] **Step 4: Run full test file**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/htmlDiff.test.ts
git commit -m "test(htmlDiff): pin identical-content behavior"
```

---

## Task 3: Word-level diff for changed text node

**Files:**
- Modify: `src/utils/htmlDiff.ts`
- Modify: `src/utils/htmlDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/htmlDiff.test.ts`:

```typescript
  it('wraps only changed words within a matched text node', () => {
    const result = diffHtml('<p>hello world</p>', '<p>hello there</p>')
    expect(result).toBe('<p>hello <span data-flash="">there</span></p>')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: FAIL — current impl returns `<p>hello there</p>` (no span) because the non-empty-old path is unimplemented.

- [ ] **Step 3: Write implementation**

Replace `src/utils/htmlDiff.ts` with:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/htmlDiff.ts src/utils/htmlDiff.test.ts
git commit -m "feat(htmlDiff): word-level diff inside matched text nodes"
```

---

## Task 4: Multi-word change forms a single span

**Files:**
- Modify: `src/utils/htmlDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/htmlDiff.test.ts`:

```typescript
  it('groups contiguous new word tokens into one span', () => {
    const result = diffHtml('<p>foo bar baz</p>', '<p>foo new words baz</p>')
    expect(result).toBe('<p>foo <span data-flash="">new words</span> baz</p>')
  })
```

- [ ] **Step 2: Run test to verify it passes (regression check on Task 3)**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: PASS (4 tests). The whitespace-bridging logic added in Task 3 should already handle this. If it FAILS, fix `diffTextNodes` and re-run.

- [ ] **Step 3: Commit**

```bash
git add src/utils/htmlDiff.test.ts
git commit -m "test(htmlDiff): multi-word change forms single flash span"
```

---

## Task 5: Append paragraph at end

**Files:**
- Modify: `src/utils/htmlDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/htmlDiff.test.ts`:

```typescript
  it('wraps only the appended paragraph when one is added at the end', () => {
    const result = diffHtml('<p>A</p>', '<p>A</p><p>B</p>')
    expect(result).toBe('<p>A</p><p><span data-flash="">B</span></p>')
  })
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: PASS (5 tests). The current position-based walker handles append: new[1] has no old[1] → `markAllTextAsNew`. If FAIL, inspect walker.

- [ ] **Step 3: Commit**

```bash
git add src/utils/htmlDiff.test.ts
git commit -m "test(htmlDiff): append paragraph wraps only new element"
```

---

## Task 6: Two-phase LCS child matching (insert in middle + protect Tasks 3–5)

**Why both phases land together:** introducing only LCS with a `tag + text snippet` signature would regress Task 3 — `<p>hello world</p>` vs `<p>hello there</p>` have different signatures, so LCS wouldn't match them and the walker would mark the entire "hello there" as new. Phase-2 (same-tag fallback for unmatched children) ensures we still recurse into structurally-paired elements when signatures disagree, restoring word-level granularity.

**Files:**
- Modify: `src/utils/htmlDiff.ts`
- Modify: `src/utils/htmlDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/htmlDiff.test.ts`:

```typescript
  it('wraps only the inserted element when one is inserted in the middle', () => {
    const result = diffHtml('<p>A</p><p>B</p>', '<p>A</p><div>X</div><p>B</p>')
    expect(result).toBe('<p>A</p><div><span data-flash="">X</span></div><p>B</p>')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: FAIL — current position-based walker matches new[2] (`<p>B</p>`) with `oldChildren[2]` which is undefined, so it marks `<p>B</p>` as new. Output incorrectly wraps "B".

- [ ] **Step 3: Replace position-based child matching with two-phase LCS**

In `src/utils/htmlDiff.ts`, replace the `walk` function and add `matchChildren`, `signature`, `canPair`. The `sameKind` helper is no longer used — remove it. Final relevant section:

```typescript
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

  const pairs = matchChildren(Array.from(oldEl.childNodes), Array.from(newEl.childNodes))
  for (const [newChild, oldMatch] of pairs) {
    walk(oldMatch, newChild, doc)
  }
}

function matchChildren(oldArr: Node[], newArr: Node[]): Array<[Node, Node | null]> {
  const m = oldArr.length, n = newArr.length
  const oldSigs = oldArr.map(signature)
  const newSigs = newArr.map(signature)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldSigs[i - 1] === newSigs[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const newToOld: Array<number | null> = new Array(n).fill(null)
  const usedOld = new Set<number>()
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (oldSigs[i - 1] === newSigs[j - 1]) {
      newToOld[j - 1] = i - 1
      usedOld.add(i - 1)
      i--; j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  // Phase 2: pair leftover same-tag (or both-text) children in order.
  const unmatchedOld: number[] = []
  for (let k = 0; k < m; k++) if (!usedOld.has(k)) unmatchedOld.push(k)
  for (let k = 0; k < n; k++) {
    if (newToOld[k] !== null) continue
    for (let q = 0; q < unmatchedOld.length; q++) {
      const oldIdx = unmatchedOld[q]
      if (canPair(oldArr[oldIdx], newArr[k])) {
        newToOld[k] = oldIdx
        unmatchedOld.splice(q, 1)
        break
      }
    }
  }

  return newArr.map((node, k) => [node, newToOld[k] !== null ? oldArr[newToOld[k] as number] : null])
}

function signature(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return 'T|' + (node.nodeValue ?? '').slice(0, 30)
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    return 'E|' + (node as Element).tagName + '|' + ((node.textContent ?? '').slice(0, 30))
  }
  return 'O|'
}

function canPair(a: Node, b: Node): boolean {
  if (a.nodeType !== b.nodeType) return false
  if (a.nodeType === Node.ELEMENT_NODE) {
    return (a as Element).tagName === (b as Element).tagName
  }
  return true
}
```

- [ ] **Step 4: Run all tests to verify both the new test passes AND Tasks 1–5 still pass**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: PASS (6 tests). Specifically verify:
- Task 3 (`hello world` → `hello there`): LCS finds no match, Phase-2 pairs P→P, recurse word-diff wraps only "there". ✓
- Task 5 (append): LCS matches `<p>A</p>`, second `<p>B</p>` has no compatible unmatched old → `markAllTextAsNew` wraps "B". ✓
- New: insert in middle wraps only "X". ✓

- [ ] **Step 5: Commit**

```bash
git add src/utils/htmlDiff.ts src/utils/htmlDiff.test.ts
git commit -m "feat(htmlDiff): two-phase LCS child matching"
```

---

## Task 7: Order-preserving move (regression test, no new impl)

**Files:**
- Modify: `src/utils/htmlDiff.test.ts`

- [ ] **Step 1: Write the test**

Append to `src/utils/htmlDiff.test.ts`:

```typescript
  it('wraps only the truly new paragraph when content shifts (B,C from A,B)', () => {
    const result = diffHtml('<p>A</p><p>B</p>', '<p>B</p><p>C</p>')
    expect(result).toBe('<p>B</p><p><span data-flash="">C</span></p>')
  })
```

- [ ] **Step 2: Run the full file to verify the test passes**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: PASS (7 tests).

Trace: LCS sees `E|P|A`,`E|P|B` vs `E|P|B`,`E|P|C` → only `E|P|B` is common → old[1]↔new[0]. Phase-2: unmatched old[0] (P "A") pairs with unmatched new[1] (P "C") by same-tag → recurse, word-diff "A"→"C" → wraps "C". new[0] (P "B") matched to old[1] (P "B") → identical text → no flash.

If FAIL, double-check that `signature` returns the text-snippet-inclusive form and Phase-2 is reached.

- [ ] **Step 3: Commit**

```bash
git add src/utils/htmlDiff.test.ts
git commit -m "test(htmlDiff): order-preserving move keeps unchanged text unwrapped"
```

---

## Task 8: Whole subtree new (deep `block-cards` insertion)

**Files:**
- Modify: `src/utils/htmlDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/htmlDiff.test.ts`:

```typescript
  it('wraps every text node inside a wholly new nested subtree', () => {
    const oldHtml = '<p>A</p>'
    const newHtml = '<p>A</p><div class="block-cards"><div class="block-card"><h2>Title</h2><p>Body</p></div></div>'
    const result = diffHtml(oldHtml, newHtml)
    expect(result).toBe(
      '<p>A</p><div class="block-cards"><div class="block-card"><h2><span data-flash="">Title</span></h2><p><span data-flash="">Body</span></p></div></div>'
    )
  })
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: PASS (8 tests). The unmatched outer `<div class="block-cards">` triggers `markAllTextAsNew`, which recurses through all descendants and wraps each text node.

If FAIL, ensure `markAllTextAsNew` recurses through element children correctly.

- [ ] **Step 3: Commit**

```bash
git add src/utils/htmlDiff.test.ts
git commit -m "test(htmlDiff): wholly new nested subtree marks every text node"
```

---

## Task 9: Nested change inside `<strong>` + tag change at same position

**Files:**
- Modify: `src/utils/htmlDiff.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/htmlDiff.test.ts`:

```typescript
  it('wraps only the changed text deep inside nested elements', () => {
    const result = diffHtml(
      '<div><p>keep <strong>old</strong></p></div>',
      '<div><p>keep <strong>new</strong></p></div>',
    )
    expect(result).toBe('<div><p>keep <strong><span data-flash="">new</span></strong></p></div>')
  })

  it('wraps text when the wrapping element tag changes', () => {
    const result = diffHtml('<p>A</p>', '<h2>A</h2>')
    expect(result).toBe('<h2><span data-flash="">A</span></h2>')
  })
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: PASS (10 tests).

- Nested-change: outer `<div>` matches (same sig). Recurse into `<p>`. Inside `<p>`, LCS over children [Text "keep ", STRONG]. Text "keep " matches both sides (same sig `T|keep `). STRONG sigs differ (`E|STRONG|old` vs `E|STRONG|new`). Phase-2 (from Task 7) pairs them by tag, recurses, word-diffs "old"→"new", wraps "new".
- Tag change: P vs H2, no LCS match, no canPair (different tags) → `markAllTextAsNew` wraps "A".

If FAIL, double-check `signature` returns consistent values and `canPair` is reached.

- [ ] **Step 3: Commit**

```bash
git add src/utils/htmlDiff.test.ts
git commit -m "test(htmlDiff): nested change + tag change at same position"
```

---

## Task 10: Strip stale `<span data-flash>` markers from old content

**Files:**
- Modify: `src/utils/htmlDiff.ts`
- Modify: `src/utils/htmlDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/htmlDiff.test.ts`:

```typescript
  it('strips stale flash markers from old content before diffing', () => {
    const result = diffHtml(
      '<p><span data-flash="">x</span></p>',
      '<p>x y</p>',
    )
    expect(result).toBe('<p>x <span data-flash="">y</span></p>')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: FAIL — without stripping, old's only child is `<span>` (Element), new's only child is text "x y". Different node kinds → text node falls into `markAllTextAsNew` → wraps "x y" instead of only "y".

- [ ] **Step 3: Add `unwrapFlashSpans` and call it on old root**

In `src/utils/htmlDiff.ts`, update `diffHtml` and add the helper:

```typescript
export function diffHtml(oldHtml: string, newHtml: string): string {
  const parser = new DOMParser()
  const oldDoc = parser.parseFromString(`<root>${oldHtml}</root>`, 'text/html')
  const newDoc = parser.parseFromString(`<root>${newHtml}</root>`, 'text/html')
  const oldRoot = oldDoc.body.firstChild as HTMLElement | null
  const newRoot = newDoc.body.firstChild as HTMLElement | null
  if (!newRoot) return newHtml
  if (oldRoot) {
    unwrapFlashSpans(oldRoot)
    oldRoot.normalize()
  }
  walk(oldRoot, newRoot, newDoc)
  return newRoot.innerHTML
}

function unwrapFlashSpans(root: Element): void {
  const spans = root.querySelectorAll('span[data-flash]')
  spans.forEach(span => {
    const parent = span.parentNode
    if (!parent) return
    while (span.firstChild) parent.insertBefore(span.firstChild, span)
    parent.removeChild(span)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/utils/htmlDiff.test.ts`
Expected: PASS (11 tests). All previous tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/htmlDiff.ts src/utils/htmlDiff.test.ts
git commit -m "feat(htmlDiff): strip stale flash markers from old before diffing"
```

---

## Task 11: CSS flash animation

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Append the keyframes + selector at the end of the file**

Open `src/styles.css` and append:

```css
/* ─── Diff flash for new/modified content ────────────────────────────────── */

@keyframes diff-flash {
  0%   { background-color: rgba(255, 107, 43, 0.45); }
  100% { background-color: transparent; }
}

.block-content [data-flash] {
  animation: diff-flash 1s ease-out forwards;
  border-radius: 2px;
}
```

- [ ] **Step 2: Run typecheck + tests**

Run: `pnpm test`
Expected: all tests still PASS.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(styles): add diff-flash keyframe for new content highlight"
```

---

## Task 12: Wire `diffHtml` into `set_block_html`

**Files:**
- Modify: `src/components/BrowserToolBridge.tsx` (the `set_block_html` handler, around lines 141–164)

- [ ] **Step 1: Update the `set_block_html` handler to compute the diff**

In `src/components/BrowserToolBridge.tsx`, add the import at the top:

```typescript
import { diffHtml } from '#/utils/htmlDiff'
```

Then replace the `set_block_html` handler body. Find the existing block:

```typescript
    set_block_html: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const html = readString(args.html).trim()
      if (!id || !html) throw new Error('id and html are required')
      if (!sectionsRef.current.find(s => s.id === id)) throw new Error(`Section not found: ${id}`)
      const updates: Partial<SectionInput> = { content: html }
      if (typeof args.topic === 'string' && args.topic.trim()) {
        updates.topic = args.topic.trim()
      }
      updateSection(id, updates)
```

Replace with:

```typescript
    set_block_html: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id)
      const html = readString(args.html).trim()
      if (!id || !html) throw new Error('id and html are required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      const annotated = diffHtml(section.content, html)
      const updates: Partial<SectionInput> = { content: annotated }
      if (typeof args.topic === 'string' && args.topic.trim()) {
        updates.topic = args.topic.trim()
      }
      updateSection(id, updates)
```

The rest of the handler (outline animation, return value) stays unchanged.

- [ ] **Step 2: Typecheck**

Run: `pnpm vitest run` (also catches type errors via Vite during transformation)
Expected: all tests PASS, no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/BrowserToolBridge.tsx
git commit -m "feat(browserTools): annotate set_block_html updates with diff flash spans"
```

---

## Task 13: Manual browser verification

**Files:** none

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Wait for "Local: http://localhost:3000" and open the app.

- [ ] **Step 2: Trigger a `set_block_html` flow end-to-end**

Use the agent to:
1. Add a new block via `add_agent_block` with some topic.
2. Append some initial content via `append_to_block` (e.g., `<p>Initial paragraph</p>`).
3. Call `set_block_html` replacing it with `<p>Initial paragraph</p><div><p>New paragraph here</p></div>`.
4. Observe: "New paragraph here" flashes orange for ~1s. "Initial paragraph" does NOT flash.

- [ ] **Step 3: Trigger a fine-grained word change**

Have the agent call `set_block_html` again with `<p>Initial sentence</p><div><p>New paragraph here</p></div>`.
Observe: only "sentence" flashes orange (because only that word changed within the first `<p>`).

- [ ] **Step 4: Trigger a wholly new block-cards subtree**

Have the agent call `set_block_html` with HTML adding a `<div class="block-cards"><div class="block-card"><span class="block-stat">2x</span><p>Faster than before</p></div></div>` after the existing content.
Observe: "2x" and "Faster than before" both flash orange; the existing paragraphs do not.

- [ ] **Step 5: Final commit if any tweaks were needed**

If anything was off and required follow-up fixes, commit them now with a descriptive message. Otherwise no commit needed.

```bash
# Only if changes:
git add -A
git commit -m "fix(htmlDiff): <describe>"
```

---

## Self-Review Checklist (completed at plan-write time)

1. **Spec coverage:**
   - Module `htmlDiff.ts` → Task 1, 3, 6, 7, 10.
   - Tests covering all 11 cases from spec → Tasks 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.
   - CSS keyframes + selector → Task 11.
   - Integration in `BrowserToolBridge.set_block_html` → Task 12.
   - Outline flash unchanged → confirmed in Task 12 (handler body below the new lines is untouched).
   - Manual verification → Task 13.
2. **Placeholder scan:** Task 2 step 2-3 is documented as "test may pass on first run because it pins behavior we already have"; this is explicit and acceptable. Task 7 is now an unconditional test-only task (no impl). No other conditionals.
3. **Type consistency:** `diffHtml` signature is stable across tasks (`(oldHtml: string, newHtml: string) => string`). Internal helper names (`walk`, `markAllTextAsNew`, `diffTextNodes`, `matchChildren`, `signature`, `canPair`, `unwrapFlashSpans`, `tokenize`, `isWord`, `lcsMembership`) are introduced once and reused consistently.
4. **Ambiguity:** Each test's expected output is a literal string. The walker's behavior is fully specified by the code snippets in Tasks 3, 6, 7, 10. No "do what's right" language.
