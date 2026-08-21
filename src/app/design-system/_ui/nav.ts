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

/** 문서에 따로 싣지 않는 컴포넌트.
 *  CardContainer는 레이아웃 보조라 설명할 것이 없고, *CardSkeleton 둘은 Skeleton의
 *  프리셋이라 Skeleton 페이지 안에서 함께 보여 준다 — 목록에 세 칸을 쓰면
 *  파생물이 원본과 같은 무게로 보인다. */
const HIDDEN = ['CardContainer', 'MovieCardSkeleton', 'TheaterCardSkeleton']

export const documentedComponents = () => manifest.components.filter(c => !HIDDEN.includes(c.name))

export const componentPages = (): DocPageRef[] =>
  documentedComponents().map(c => ({ href: `/design-system/components/${c.name}`, label: c.name }))

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
  {
    title: 'Maintenance',
    href: '/design-system/maintenance',
    items: [
      { href: '/design-system/drift', label: '코드 ↔ 피그마 차이' },
      { href: '/design-system/ai', label: 'AI Collaboration' },
    ],
  },
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
