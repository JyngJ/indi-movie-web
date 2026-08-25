/**
 * Icon — 서비스의 유일한 아이콘 진입점.
 *
 * 'use client'를 붙이지 않는다. 훅도 핸들러도 없는 순수 표시 컴포넌트이고, 클라이언트
 * 모듈로 만들면 ICON_SIZE·ICON_NAMES를 서버 컴포넌트에서 읽을 때 값이 아니라 참조
 * 프록시가 와서 Object.keys가 빈 배열이 된다(파운데이션 문서가 실제로 그렇게 비었다).
 *
 * 왜 이름(name)으로 부르나: 인라인 <svg>가 171개까지 늘어난 이유는 "어디에 뭐가 있는지"를
 * 알 방법이 없어서였다. 문자열 이름이면 grep으로 세지고, 디자인 시스템 사이트에서
 * 목록을 그대로 렌더할 수 있고, 나중에 아이콘 소스를 갈아끼워도 호출부가 안 바뀐다.
 *
 * 굵기·크기는 여기서만 정한다. 예전에는 같은 셰브론이 1.5 / 1.75 / 2 / 2.5로 제각각이었다.
 *
 * 이름은 용도가 아니라 형태를 따른다. lucide 글리프 이름을 kebab-case로 그대로 쓴다.
 * 같은 그림이 자리마다 다른 뜻을 갖기 때문이다 — 동그라미 친 x는 어디선 "실패"고 어디선
 * "지우기"인데, 이름을 success/error로 붙이면 지우기 버튼에 error를 쓰는 꼴이 되거나
 * 같은 그림이 두 이름으로 중복 등록된다. circle-x라고 부르면 그런 일이 생기지 않는다.
 * 뜻은 색(--color-error 등)과 라벨이 맡고, 이름은 그림만 가리킨다.
 */

import {
  ArrowDown, ArrowRightLeft, ArrowUp, Bell, Building2, Calendar, Camera, Check, ChevronDown,
  ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleQuestionMark, CircleX,
  Clapperboard, Clock, Copy, Ellipsis, ExternalLink, Eye, Film, Funnel, Heart, Info,
  LayoutGrid, LoaderCircle, LocateFixed, Lock, Map as MapGlyph, MapPin, MapPinned, Minus,
  Moon, Plus, Scale, Search, Send, Share2, Smartphone, Theater, TrendingDown, TrendingUp,
  User, UserRound, X, ZoomIn,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { CSSProperties, ComponentType } from 'react'

/* -- 크기 스케일 -------------------------------------------------- */
/** 아이콘 크기 토큰. 하드코딩 px 대신 이 다섯 단계만 쓴다. */
export const ICON_SIZE = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const
export type IconSize = keyof typeof ICON_SIZE

/**
 * 획 굵기는 크기를 따라간다.
 * 24 뷰박스를 12px로 줄이면 1.75 획은 실제 0.9px가 되어 사라진다 — 작을수록 굵게 그려야
 * 같은 밀도로 보인다. 예전 코드가 사이즈마다 1.5~2.5를 손으로 적어 둔 이유가 이것이고,
 * 그 규칙을 여기 한 곳에 적는다.
 */
function strokeFor(px: number) {
  if (px <= 12) return 2.5
  if (px <= 16) return 2
  return 1.75
}

const DEFAULT_STROKE = 1.75

/* -- 커스텀 글리프 ------------------------------------------------ */
/*
 * lucide에 없는 것만 손으로 그린다. 나머지는 절대 새로 그리지 않는다.
 *
 * 여기 있는 마크는 링크·출처 표시용이다. 브랜드가 규격을 못박아 둔 것(카카오 로그인
 * 버튼처럼 색·비율·문구까지 정해진 것)은 레지스트리에 두지 않는다 — 이 파일의 획·크기
 * 규칙이 그 규격을 덮어쓸 수 있기 때문이다. 그런 마크는 해당 컴포넌트가 직접 갖는다.
 */

const InstagramGlyph = ({ size = 24, strokeWidth = DEFAULT_STROKE, ...rest }: LucideProps) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const GithubGlyph = ({ size = 24, ...rest }: LucideProps) => (
  <svg {...rest} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

const LinkedInGlyph = ({ size = 24, ...rest }: LucideProps) => (
  <svg {...rest} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

/* -- 레지스트리 --------------------------------------------------- */

const REGISTRY = {
  /* 이동 */
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrow-right-left': ArrowRightLeft,
  /* 조작 */
  x: X,
  plus: Plus,
  minus: Minus,
  check: Check,
  'layout-grid': LayoutGrid,
  search: Search,
  copy: Copy,
  funnel: Funnel,
  'zoom-in': ZoomIn,
  ellipsis: Ellipsis,
  /* 상태 — success·error는 문서 사이트의 Do/Don't가 쓴다 */
  info: Info,
  'circle-question-mark': CircleQuestionMark,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'circle-x': CircleX,
  'loader-circle': LoaderCircle,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  /* 도메인 */
  heart: Heart,
  film: Film,
  clapperboard: Clapperboard,
  theater: Theater,
  camera: Camera,
  smartphone: Smartphone,
  user: User,
  'user-round': UserRound,
  'building-2': Building2,
  calendar: Calendar,
  clock: Clock,
  bell: Bell,
  eye: Eye,
  scale: Scale,
  lock: Lock,
  /* 지도 */
  'map-pin': MapPin,
  map: MapGlyph,
  'locate-fixed': LocateFixed,
  'map-pinned': MapPinned,
  /* 테마 */
  moon: Moon,
  /* 외부 */
  'share-2': Share2,
  'external-link': ExternalLink,
  send: Send,
  instagram: InstagramGlyph,
  github: GithubGlyph,
  linkedin: LinkedInGlyph,
} satisfies Record<string, ComponentType<LucideProps>>

export type IconName = keyof typeof REGISTRY

/** 디자인 시스템 사이트에서 목록을 렌더하려고 내보낸다. */
export const ICON_NAMES = Object.keys(REGISTRY) as IconName[]

/* -- 컴포넌트 ----------------------------------------------------- */

export type IconProps = {
  name: IconName
  /** 토큰 이름(xs~xl) 또는 px. 기본 md(16). */
  size?: IconSize | number
  /** 채우기용. heart 같은 토글 아이콘에서만 쓴다. */
  fill?: string
  strokeWidth?: number
  color?: string
  className?: string
  style?: CSSProperties
  /** 의미를 가진 아이콘이면 라벨을 준다. 없으면 aria-hidden 처리된다. */
  label?: string
}

export function Icon({
  name,
  size = 'md',
  fill = 'none',
  strokeWidth,
  color = 'currentColor',
  className,
  style,
  label,
}: IconProps) {
  const Glyph = REGISTRY[name]
  const px = typeof size === 'number' ? size : ICON_SIZE[size]

  return (
    <Glyph
      size={px}
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth ?? strokeFor(px)}
      className={className}
      style={style}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable={false}
    />
  )
}
