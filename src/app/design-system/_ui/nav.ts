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

/** 그룹 헤더는 그 섹션의 표지 페이지로 간다 — 무엇을 다루는 묶음인지 먼저 보여주고,
 *  딸린 페이지는 카드로 안내한다. */
export const NAV_GROUPS = () => [
  { title: null, href: null, items: [{ href: '/design-system', label: 'Overview' }] },
  { title: 'Foundations', href: '/design-system/foundations', items: FOUNDATION_PAGES },
  {
    title: 'Components',
    href: '/design-system/components',
    items: componentPages(),
  },
  // 표지가 곧 그 페이지라 하위 항목을 따로 두지 않는다(같은 링크가 두 번 켜져 보였다)
  { title: 'Maintenance', href: '/design-system/drift', items: [] },
]

/** 문서 전체를 한 줄로 편 순서 — Prev/Next는 여기서 계산한다.
 *  그룹 표지도 순서에 낀다(표지 → 딸린 페이지들 → 다음 표지). */
export const flatPages = (): DocPageRef[] =>
  NAV_GROUPS().flatMap(g => {
    const cover = g.href && g.title ? [{ href: g.href, label: g.title }] : []
    const items = g.items.filter(i => i.href !== g.href)
    return [...cover, ...items]
  })

export function siblings(href: string) {
  const pages = flatPages()
  const i = pages.findIndex(p => p.href === href)
  return { prev: i > 0 ? pages[i - 1] : null, next: i >= 0 && i < pages.length - 1 ? pages[i + 1] : null }
}
