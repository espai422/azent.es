import { describe, it, expect } from 'vitest'
import { diffHtml } from './htmlDiff'

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
})
