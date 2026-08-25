/** 사이드바·Prev/Next가 공유하는 문서 순서. 한 곳에서만 정의한다. */
import { manifest } from '@/design-system'

export interface DocPageRef {
  href: string
  label: string
  /** 사이드바에서 이 항목이 속한 묶음. 값이 바뀌는 자리에 소제목을 그린다. */
  section?: string
}

export const FOUNDATION_PAGES: DocPageRef[] = [
  { href: '/design-system/foundations/color', label: 'Color' },
  { href: '/design-system/foundations/typography', label: 'Typography' },
  { href: '/design-system/foundations/spacing', label: 'Spacing' },
  { href: '/design-system/foundations/radius', label: 'Radius' },
  { href: '/design-system/foundations/elevation', label: 'Elevation' },
  { href: '/design-system/foundations/writing', label: 'Writing' },
  { href: '/design-system/foundations/iconography', label: 'Iconography' },
]

/** 문서에 따로 싣지 않는 컴포넌트.
 *  CardContainer는 레이아웃 보조라 설명할 것이 없고, *CardSkeleton 둘은 Skeleton의
 *  프리셋이라 Skeleton 페이지 안에서 함께 보여 준다 — 목록에 세 칸을 쓰면
 *  파생물이 원본과 같은 무게로 보인다.
 *  Icon은 컴포넌트가 아니라 파운데이션(Iconography)으로 다룬다 — 색·타이포처럼
 *  다른 컴포넌트가 그 위에 선다. */
const HIDDEN = [
  'CardContainer', 'MovieCardSkeleton', 'TheaterCardSkeleton', 'Icon',
  // Carousel의 조각들 — 혼자 서지 못하고 Carousel 안에서만 쓰인다
  'CarouselContent', 'CarouselItem', 'CarouselNavigation', 'CarouselIndicator', 'useCarousel',
]

export const documentedComponents = () => manifest.components.filter(c => !HIDDEN.includes(c.name))

/**
 * 컴포넌트를 하는 일로 묶는다. 35개를 한 줄로 세우면 목록이 아니라 사전이 된다 —
 * 무엇을 찾는지 알 때만 쓸 수 있고, 무엇이 있는지 훑을 때는 쓸모가 없다.
 */
export const COMPONENT_GROUPS: { title: string; desc: string; names: string[] }[] = [
  {
    title: 'Action',
    desc: '누르면 무언가가 일어나는 것',
    names: ['Button', 'IconButton', 'FabRound', 'ScrollNavButton', 'FavoriteButton', 'SortToggle', 'KakaoLoginButton'],
  },
  {
    title: 'Selection',
    desc: '하나를 고르는 것',
    names: ['Chip', 'FilterPill', 'GenreChip', 'DirectorChip', 'PosterChip', 'Switch', 'Tabs', 'DropdownRow'],
  },
  {
    title: 'Input',
    desc: '사용자가 입력하는 자리',
    names: ['Input', 'SearchBar', 'SearchBarButton'],
  },
  {
    title: 'Display',
    desc: '정보를 보여주는 것',
    names: ['Card', 'Avatar', 'Badge', 'SectionHeader', 'ListRow', 'MenuCard', 'MenuRow', 'Divider', 'Wordmark'],
  },
  {
    title: 'Feedback',
    desc: '상태를 알리는 것',
    names: ['Toast', 'EmptyState', 'Skeleton'],
  },
  {
    title: 'Overlay',
    desc: '화면 위에 얹히는 면',
    names: ['BottomSheet', 'ConfirmDialog', 'PanelShell', 'BubbleTail'],
  },
]

/** 그룹에 넣는 걸 잊은 컴포넌트가 목록에서 사라지면 안 된다 — 남은 것은 기타로 모은다. */
export const groupedComponents = () => {
  const documented = documentedComponents().map(c => c.name)
  const placed = new Set(COMPONENT_GROUPS.flatMap(g => g.names))
  const rest = documented.filter(n => !placed.has(n))
  const groups = COMPONENT_GROUPS.map(g => ({ ...g, names: g.names.filter(n => documented.includes(n)) }))
  return rest.length ? [...groups, { title: '기타', desc: '아직 분류되지 않은 것', names: rest }] : groups
}

export const componentPages = (): DocPageRef[] =>
  groupedComponents().flatMap(g =>
    g.names.map(name => ({ href: `/design-system/components/${name}`, label: name, section: g.title })),
  )

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
