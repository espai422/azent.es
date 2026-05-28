# HTML Diff Flash — Design Spec
**Date:** 2026-05-29

## Context

The Codex agent edits blocks on the AZENT landing page via two browser tools: `append_to_block` (incremental writing) and `set_block_html` (full content replacement / refactor). Today both tools end with a subtle flash to signal change:

- `append_to_block` animates only the *last child element* with a 350ms background flash at 15% opacity. If the appended HTML contains multiple elements, only the trailing one gets highlighted.
- `set_block_html` only flashes the section's *outline*, never the content. When the agent rewrites a paragraph or swaps a single word, the user has no visual cue about *what* changed.

Result: new and modified content blends visually with old content. The user can easily miss that something just changed, or read the same passage twice trying to find the diff.

This spec adds an intelligent text-level diff to `set_block_html` so newly added or modified text fragments are highlighted in the project's accent orange for ~1 second before fading back to normal. `append_to_block` is intentionally out of scope (its existing flash works for its narrow use case).

---

## Goals

1. On every `set_block_html`, compute a structural + text-level diff between the previous block content and the incoming HTML.
2. Wrap only the *new* or *changed* text fragments in flash markers — never the whole block, never untouched text.
3. Whole subtrees that are new (e.g. an inserted `<div>` containing paragraphs) get *all* their text highlighted.
4. Word-level granularity inside text nodes: if only one word in a sentence changes, only that word is highlighted.
5. The block's outline flash (current behavior) stays as a complementary "this section just got updated" signal.
6. When the previous content was empty, the diff naturally marks everything as new — no special case needed.
7. The diff state must not accumulate across calls: flash markers from a previous render are stripped before computing the next diff.

---

## Non-Goals

- Diffing for `append_to_block`. Its current per-call flash is sufficient because everything appended is by definition new.
- Showing deletions. Removed content is gone; we display only the new state.
- Diffing attribute changes (only structure + text content).
- A general-purpose HTML diff library suitable for arbitrary HTML. The agent emits a controlled subset (headings, paragraphs, lists, `block-cards`, `block-card`, `block-stat`, basic inline tags).

---

## Architecture

### New module: `src/utils/htmlDiff.ts`

Single exported pure function:

```typescript
export function diffHtml(oldHtml: string, newHtml: string): string
```

Returns `newHtml` with text fragments that are new or changed relative to `oldHtml` wrapped in `<span data-flash>…</span>`.

The function is environment-agnostic in shape but relies on `DOMParser`, so it runs only in the browser (where the tool handler executes anyway).

### Integration: `BrowserToolBridge.tsx → set_block_html`

```ts
const section = sectionsRef.current.find(s => s.id === id)
if (!section) throw new Error(`Section not found: ${id}`)
const annotated = diffHtml(section.content, html)
const updates: Partial<SectionInput> = { content: annotated }
if (typeof args.topic === 'string' && args.topic.trim()) {
  updates.topic = args.topic.trim()
}
updateSection(id, updates)
// existing outline flash stays as-is
```

The section's stored `content` now contains `<span data-flash>` wrappers around the new fragments. They are visually invisible after the animation completes; they get stripped on the *next* diff.

### CSS: `src/styles.css`

```css
@keyframes diff-flash {
  0%   { background-color: rgba(255, 107, 43, 0.45); }
  100% { background-color: transparent; }
}

.block-content [data-flash] {
  animation: diff-flash 1s ease-out forwards;
  border-radius: 2px;
}
```

The animation runs once per `<span data-flash>` when it mounts (i.e. when React commits the new innerHTML). `forwards` keeps the final transparent state after the animation ends, so further re-renders don't replay it.

---

## Diff Algorithm

### Step 1 — Parse and clean

```
oldRoot = parse(`<root>${oldHtml}</root>`).body.firstChild
newRoot = parse(`<root>${newHtml}</root>`).body.firstChild
unwrapFlashSpans(oldRoot)   // remove inherited <span data-flash> wrappers
oldRoot.normalize()          // merge adjacent text nodes after unwrap
```

`unwrapFlashSpans` walks `oldRoot.querySelectorAll('span[data-flash]')` and moves each span's children up to its parent before removing the empty span. `normalize()` then merges adjacent text node siblings so subsequent text comparisons see whole strings, not fragmented runs.

### Step 2 — Walk in parallel

```
walk(oldNode, newNode):
  if newNode is text and oldNode is text:
    diffTextNodes(oldNode, newNode)
    return

  if oldNode is null or oldNode.tagName !== newNode.tagName:
    markAllTextAsNew(newNode)
    return

  // Both are elements with same tag — match children.
  matchedPairs = lcsMatchChildren(oldNode.childNodes, newNode.childNodes)
  for each (newChild, oldMatch) in matchedPairs:
    walk(oldMatch, newChild)   // oldMatch may be null → marks newChild as new
```

`markAllTextAsNew(node)` does a depth-first traversal, replacing each text node with a `<span data-flash>` wrapping the same text.

### Step 3 — LCS matching of children

Children are matched with a Longest Common Subsequence over a *signature* string per node:

- Element: `tag + '|' + textContent.slice(0, 30)`
- Text: `'TEXT|' + nodeValue.slice(0, 30)`

This handles common cases correctly:

- `[P "A", P "B"] → [P "A", DIV "X", P "B"]`: LCS matches both `P`s by signature, leaving `DIV "X"` unmatched → all text in DIV is marked.
- `[P "A"] → [P "B"]`: same tag at same position, signatures differ but LCS still pairs them (no other candidate) → recurse, word-diff finds "B" replaced "A" → "B" marked.
- `[P "A", P "B"] → [P "B", P "C"]`: signatures `[P|A, P|B]` vs `[P|B, P|C]`. LCS finds `P|B` as common; `P "C"` unmatched → only "C" marked. (Position-only matching would have wrongly marked "B" too.)

Implementation: standard DP table over child sequences, then backtrack to produce `(newIndex, oldIndex | null)` pairs.

### Step 4 — Word-level diff for matched text nodes

```
diffTextNodes(oldText, newText):
  oldTokens = tokenize(oldText.nodeValue)
  newTokens = tokenize(newText.nodeValue)
  lcs = computeLcs(oldTokens, newTokens)
  // Produce a sequence of (token, isNew) pairs for newTokens
  // Group consecutive isNew=true tokens into spans
  replace newText with the assembled DOM fragment
```

Tokenization: `text.split(/(\s+)/)` keeps whitespace as its own tokens, so word boundaries are preserved exactly when reconstructing. Each contiguous run of "new" tokens becomes one `<span data-flash>token1 token2…</span>` — not one span per word — so the flash visually reads as a single highlighted phrase.

Edge case: runs of pure whitespace are not wrapped on their own (a whitespace-only span would be visually nothing but might affect layout in rare cases). Whitespace sandwiched between two new word tokens is included in the span.

### Step 5 — Serialize

Return `newRoot.innerHTML` as the final HTML string.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| `oldHtml === ''` | `oldRoot` has no children → every child of `newRoot` is unmatched → all text wrapped. |
| `oldHtml === newHtml` | LCS matches everything; no text differs → zero spans added; output equals input. |
| Old contains stale `<span data-flash>` from previous render | Stripped via `unwrapFlashSpans` + `normalize()` before walking. |
| New HTML has element with same tag but completely different text | Same-tag → recurse; text nodes differ → word-diff highlights new tokens. |
| Deep nesting (`div > p > strong`) with change only in `<strong>` | Walk recurses to the `<strong>`, word-diffs its text node, highlights only the changed words. |
| Whitespace-only changes (indentation tweaks) | Tokenizer treats whitespace as tokens; if visible text is unchanged, only whitespace tokens would differ. To avoid visual noise, runs whose tokens are *all* whitespace are not wrapped. |
| Inline HTML in text (e.g. agent emits raw `&amp;`) | Parser decodes entities; comparison happens on decoded text. Output re-encodes via `innerHTML`. |

---

## Testing

Test file: `src/utils/htmlDiff.test.ts` (vitest).

1. **Empty old** — `diffHtml('', '<p>hello</p>')` → `<p><span data-flash>hello</span></p>`.
2. **Identical** — `diffHtml('<p>same</p>', '<p>same</p>')` → `<p>same</p>` (no spans).
3. **Append paragraph** — `'<p>A</p>'` → `'<p>A</p><p>B</p>'`: only `<p>B</p>`'s text wrapped.
4. **Insert div in middle** — `'<p>A</p><p>B</p>'` → `'<p>A</p><div>X</div><p>B</p>'`: only "X" wrapped.
5. **Word change in paragraph** — `'<p>hello world</p>'` → `'<p>hello there</p>'`: only "there" wrapped.
6. **Multiple word change forms one span** — `'<p>foo bar baz</p>'` → `'<p>foo new words baz</p>'`: "new words" (with the space between) wrapped in a single span, not two.
7. **Nested change** — `'<div><p>keep <strong>old</strong></p></div>'` → `'<div><p>keep <strong>new</strong></p></div>'`: only "new" wrapped inside the `<strong>`.
8. **Stale flash markers stripped** — `diffHtml('<p><span data-flash>x</span></p>', '<p>x y</p>')`: only "y" wrapped, "x" not re-wrapped.
9. **Whole subtree new** — `'<p>A</p>'` → `'<p>A</p><div class="block-cards"><div class="block-card"><h2>Title</h2><p>Body</p></div></div>'`: both "Title" and "Body" wrapped, structure preserved.
10. **Tag change at same position** — `'<p>A</p>'` → `'<h2>A</h2>'`: "A" wrapped because the wrapping element type changed.
11. **Order-preserving move** — `'<p>A</p><p>B</p>'` → `'<p>B</p><p>C</p>'`: only "C" wrapped (LCS picks `P|B` as common).

---

## Implementation Steps (high level)

1. Create `src/utils/htmlDiff.ts` with `diffHtml`, `unwrapFlashSpans`, `markAllTextAsNew`, internal LCS helpers, and `diffTextNodes`.
2. Add unit tests `src/utils/htmlDiff.test.ts` covering all cases above.
3. Add the `@keyframes diff-flash` and `.block-content [data-flash]` rules to `src/styles.css`.
4. Wire `diffHtml` into `BrowserToolBridge.tsx` inside the `set_block_html` handler; keep the existing outline animation unchanged.
5. Manually verify in the browser by triggering `set_block_html` from the agent with various edits.

---

## Open Questions

None at design time. Open questions during implementation will be tracked in the implementation plan.
