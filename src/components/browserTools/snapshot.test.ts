import { describe, expect, it } from 'vitest'
import { createPageSnapshot } from './snapshot'
import type { SectionConfig } from '#/components/sections'

describe('createPageSnapshot', () => {
  it('strips flash spans from section content', () => {
    const sections: SectionConfig[] = [{
      id: 'intro',
      theme: 'dark-1',
      tab: 'center',
      content: '<p>Hello <span data-flash="">world</span></p>',
    }]

    expect(createPageSnapshot({
      title: 'AZENT',
      url: 'https://example.test',
      sections,
    })).toEqual({
      title: 'AZENT',
      url: 'https://example.test',
      sections: [{
        index: 0,
        id: 'intro',
        theme: 'dark-1',
        tab: 'center',
        content: '<p>Hello world</p>',
      }],
    })
  })
})
