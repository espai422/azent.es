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
})
