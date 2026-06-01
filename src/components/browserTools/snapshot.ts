import type { SectionConfig } from '#/components/sections'
import { stripFlashSpans } from '#/utils/htmlDiff'

export function createPageSnapshot({
  title,
  url,
  sections,
}: {
  title: string
  url: string
  sections: SectionConfig[]
}) {
  return {
    title,
    url,
    sections: sections.map((section, index) => ({
      index,
      ...section,
      content: stripFlashSpans(section.content),
    })),
  }
}
