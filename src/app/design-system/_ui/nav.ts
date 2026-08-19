/** 사이드바·Prev/Next가 공유하는 문서 순서. 한 곳에서만 정의한다. */
import { manifest } from '@/design-system'

export interface DocPageRef {
  href: string
  label: string
}

export const FOUNDATION_PAGES: DocPageRef[] = [
  { href: '/design-system/foundations/color', label: 'Color' },
  { href: '/design-system/foundations/typography', label: 'Typography' },
  { href: '/design-system/foundations/spacing', label: 'Spacing' },
  { href: '/design-system/foundations/radius', label: 'Radius' },
  { href: '/design-system/foundations/elevation', label: 'Elevation' },
]

export const componentPages = (): DocPageRef[] =>
  manifest.components.map(c => ({ href: `/design-system/components/${c.name}`, label: c.name }))

export const NAV_GROUPS = () => [
  { title: null, items: [{ href: '/design-system', label: 'Overview' }] },
  { title: 'Foundations', items: FOUNDATION_PAGES },
  {
    title: 'Components',
    items: [{ href: '/design-system/components', label: '전체 목록' }, ...componentPages()],
  },
  { title: 'Maintenance', items: [{ href: '/design-system/drift', label: '코드 ↔ 피그마 차이' }] },
]

/** 문서 전체를 한 줄로 편 순서 — Prev/Next는 여기서 계산한다. */
export const flatPages = (): DocPageRef[] => NAV_GROUPS().flatMap(g => g.items)

export function siblings(href: string) {
  const pages = flatPages()
  const i = pages.findIndex(p => p.href === href)
  return { prev: i > 0 ? pages[i - 1] : null, next: i >= 0 && i < pages.length - 1 ? pages[i + 1] : null }
}
