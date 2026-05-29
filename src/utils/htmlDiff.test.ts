import { describe, it, expect } from 'vitest'
import { diffHtml, stripFlashSpans, wrapAllTextAsFlash } from './htmlDiff'

describe('diffHtml', () => {
  it('wraps all text as new when old is empty', () => {
    const result = diffHtml('', '<p>hello</p>')
    expect(result).toBe('<p><span data-flash="">hello</span></p>')
  })

  it('produces no spans when content is identical', () => {
    const result = diffHtml('<p>same</p>', '<p>same</p>')
    expect(result).toBe('<p>same</p>')
  })

  it('wraps only changed words within a matched text node', () => {
    const result = diffHtml('<p>hello world</p>', '<p>hello there</p>')
    expect(result).toBe('<p>hello <span data-flash="">there</span></p>')
  })

  it('groups contiguous new word tokens into one span', () => {
    const result = diffHtml('<p>foo bar baz</p>', '<p>foo new words baz</p>')
    expect(result).toBe('<p>foo <span data-flash="">new words</span> baz</p>')
  })

  it('wraps only the appended paragraph when one is added at the end', () => {
    const result = diffHtml('<p>A</p>', '<p>A</p><p>B</p>')
    expect(result).toBe('<p>A</p><p><span data-flash="">B</span></p>')
  })

  it('wraps only the inserted element when one is inserted in the middle', () => {
    const result = diffHtml('<p>A</p><p>B</p>', '<p>A</p><div>X</div><p>B</p>')
    expect(result).toBe('<p>A</p><div><span data-flash="">X</span></div><p>B</p>')
  })

  it('wraps only the truly new paragraph when content shifts (B,C from A,B)', () => {
    const result = diffHtml('<p>A</p><p>B</p>', '<p>B</p><p>C</p>')
    expect(result).toBe('<p>B</p><p><span data-flash="">C</span></p>')
  })

  it('wraps every text node inside a wholly new nested subtree', () => {
    const oldHtml = '<p>A</p>'
    const newHtml = '<p>A</p><div class="block-cards"><div class="block-card"><h2>Title</h2><p>Body</p></div></div>'
    const result = diffHtml(oldHtml, newHtml)
    expect(result).toBe(
      '<p>A</p><div class="block-cards"><div class="block-card"><h2><span data-flash="">Title</span></h2><p><span data-flash="">Body</span></p></div></div>'
    )
  })

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

  it('strips stale flash markers from old content before diffing', () => {
    const result = diffHtml(
      '<p><span data-flash="">x</span></p>',
      '<p>x y</p>',
    )
    expect(result).toBe('<p>x <span data-flash="">y</span></p>')
  })

  it('strips stale flash markers from new content too (agent re-sent snapshot)', () => {
    const result = diffHtml(
      '<p><span data-flash="">x</span></p>',
      '<p><span data-flash="">x</span></p>',
    )
    expect(result).toBe('<p>x</p>')
  })

  it('does not double-wrap when new html partially reuses old annotated content', () => {
    const result = diffHtml(
      '<p><span data-flash="">x</span></p>',
      '<p><span data-flash="">x</span> y</p>',
    )
    expect(result).toBe('<p>x <span data-flash="">y</span></p>')
  })
})

describe('stripFlashSpans', () => {
  it('returns empty html untouched', () => {
    expect(stripFlashSpans('')).toBe('')
  })

  it('leaves html without flash spans untouched', () => {
    expect(stripFlashSpans('<p>hello <strong>world</strong></p>')).toBe('<p>hello <strong>world</strong></p>')
  })

  it('unwraps a single flash span', () => {
    expect(stripFlashSpans('<p>hello <span data-flash="">world</span></p>')).toBe('<p>hello world</p>')
  })

  it('unwraps deeply nested flash spans', () => {
    const html = '<p><span data-flash=""><span data-flash=""><span data-flash="">eliminar</span></span></span></p>'
    expect(stripFlashSpans(html)).toBe('<p>eliminar</p>')
  })
})

describe('wrapAllTextAsFlash', () => {
  it('returns empty html untouched', () => {
    expect(wrapAllTextAsFlash('')).toBe('')
  })

  it('wraps text inside a single element', () => {
    expect(wrapAllTextAsFlash('<p>hello</p>')).toBe('<p><span data-flash="">hello</span></p>')
  })

  it('wraps text inside multiple sibling elements', () => {
    expect(wrapAllTextAsFlash('<h2>Title</h2><p>Body</p>')).toBe(
      '<h2><span data-flash="">Title</span></h2><p><span data-flash="">Body</span></p>',
    )
  })

  it('wraps nested text nodes individually', () => {
    expect(wrapAllTextAsFlash('<p>before <strong>bold</strong> after</p>')).toBe(
      '<p><span data-flash="">before </span><strong><span data-flash="">bold</span></strong><span data-flash=""> after</span></p>',
    )
  })

  it('flattens stale flash spans before wrapping', () => {
    expect(wrapAllTextAsFlash('<p><span data-flash="">already</span> flashed</p>')).toBe(
      '<p><span data-flash="">already flashed</span></p>',
    )
  })
})
