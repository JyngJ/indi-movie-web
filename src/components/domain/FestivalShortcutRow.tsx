'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { Icon } from '@/components/primitives'
import { navStart } from '@/components/domain/RouteProgressBar'
import { trackEvent } from '@/lib/analytics/client'
import { festivalShortcutDateLabel, selectShortcutFestivals } from '@/lib/festival/shortcut'
import type { Festival } from '@/types/festival'

/**
 * 상영작 탭 필터 줄 바로 아래의 영화제 바로가기 칩.
 *
 * 회기 중이거나 개막이 가까운 영화제만 뜨고, 폐막 다음 날 스스로 사라진다
 * (selectShortcutFestivals가 날짜만 보고 판단 — 회기가 끝나도 손댈 게 없다).
 * 칩이 하나도 없으면 줄 자체를 그리지 않아 빈 여백이 남지 않는다.
 *
 * 영화제 상세는 회차가 수백 개라 이동에 몇 초가 걸린다. 누른 뒤 화면이 그대로면 사람들이
 * 연타한다(2026-09 운영 로그: 한 세션 14번, 대부분 3번씩). 그래서
 *   · 화면에 뜨면 목적지를 미리 불러오고(prefetch)
 *   · 누르는 즉시 공통 진행 막대(navStart)와 바로가기 위 "이동하는 중…"을 띄우고
 *   · 이동이 끝날 때까지 다시 누르지 못하게 막는다.
 */

/* 한 번 띄운 페이지에서 이미 미리 불러온 영화제. 홈이 다시 그려질 때마다 바로가기가
   새로 마운트돼 같은 영화제를 거듭 불러왔다 — 로컬 운영 빌드에서 홈 한 번 열면
   /festival/biff31 prefetch 6건(2026-10). 요청 수가 곧 CDN 한도라 페이지당 한 번만 부른다. */
const prefetched = new Set<string>()

/* 이동이 실패해 화면에 남았을 때 바로가기를 다시 살리는 시간 */
const PENDING_RESET_MS = 10_000

interface Props {
  festivals: Festival[]
  /** ISO date "YYYY-MM-DD" */
  today: string
  isDesktop: boolean
  onSelect: (slug: string) => void
}

function compactDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${Number(month)}/${Number(day)}`
}

export function FestivalShortcutRow({ festivals, today, isDesktop, onSelect }: Props) {
  const shortcuts = selectShortcutFestivals(festivals, today)
  const router = useRouter()
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 상태는 다음 렌더에야 보인다 — 같은 순간 연달아 들어온 탭까지 막으려고 ref로도 잠근다
  const pendingRef = useRef(false)

  const slugKey = shortcuts.map((f) => f.slug).join('|')
  useEffect(() => {
    if (!slugKey) return
    for (const slug of slugKey.split('|')) {
      if (prefetched.has(slug)) continue
      prefetched.add(slug)
      router.prefetch(`/festival/${slug}`)
    }
  }, [router, slugKey])
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current) }, [])

  if (shortcuts.length === 0) return null

  return (
    <div
      className="no-scrollbar"
      style={{
        display: 'flex', gap: 'var(--spacing-2)', overflowX: 'auto',
        padding: `${isDesktop ? 'var(--spacing-12)' : 'var(--spacing-8)'} var(--gutter) 0`,
      }}
    >
      {shortcuts.map((festival) => {
        const dateLabel = festivalShortcutDateLabel(festival, today)
        // 바로가기 이미지가 있는 영화제는 칩 대신 가로 이미지 한 장 — 데이터(shortcut_image_url)가 정한다
        const image = festival.shortcutImageUrl
        const usesWideBiffLayout = isDesktop && festival.slug === 'biff31' && Boolean(image)
        return (
          <button
            key={festival.id}
            type="button"
            aria-busy={pendingSlug === festival.slug}
            aria-disabled={pendingSlug !== null}
            onClick={() => {
              if (pendingRef.current) return
              pendingRef.current = true
              setPendingSlug(festival.slug)
              if (resetTimer.current) clearTimeout(resetTimer.current)
              resetTimer.current = setTimeout(() => { pendingRef.current = false; setPendingSlug(null) }, PENDING_RESET_MS)
              navStart()
              trackEvent('curation movie selected', {
                list_id: `festival_shortcut_${festival.slug}`,
                section_title: '영화제 바로가기',
                target_type: 'festival',
                festival_slug: festival.slug,
                festival_name: festival.name,
                source: 'festival_shortcut',
              })
              onSelect(festival.slug)
            }}
            aria-label={`${festival.name} 상영 시간표 보기`}
            style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)', flexShrink: 0,
              width: image
                ? isDesktop ? '100%' : 'min(440px, calc(100vw - var(--gutter) - var(--gutter)))'
                : 'auto',
              aspectRatio: usesWideBiffLayout ? '8 / 1' : undefined,
              minHeight: 'unset',
              padding: image ? 0 : 'var(--gutter-sm) var(--gutter-md)',
              borderRadius: image ? 'var(--radius-button)' : 'var(--radius-pill)',
              /* 영화제는 필터가 아니라 다른 화면으로 나가는 문이다 — 지역칩과 헷갈리지 않게
                 GV·이벤트와 같은 브랜드 보라를 쓴다 */
              border: usesWideBiffLayout
                ? '1px solid var(--color-border)'
                : image ? 'none' : '1px solid var(--color-gv)',
              backgroundColor: usesWideBiffLayout ? 'var(--color-surface-card)' : 'var(--color-surface-bg)',
              color: 'var(--color-gv)',
              fontSize: 'var(--text-meta)', fontWeight: 700, lineHeight: 1.2,
              cursor: pendingSlug ? 'progress' : 'pointer',
              overflow: 'hidden',
            }}
          >
            {pendingSlug === festival.slug && <PendingOverlay compact={!image} />}
            {usesWideBiffLayout && image ? (
              <>
                <span
                  style={{
                    position: 'relative', zIndex: 1,
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    alignSelf: 'stretch',
                    gap: 'var(--spacing-2)',
                    padding: 'var(--spacing-8) 20% var(--spacing-8) var(--spacing-8)',
                    color: 'var(--color-text-primary)', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-body)', fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                    {compactDate(festival.startDate)}-{compactDate(festival.endDate)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h1)', fontWeight: 700, lineHeight: 1.25 }}>
                    제 31회 부산 국제 영화제
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  style={{ position: 'absolute', inset: '0 0 0 auto', width: '16%', backgroundColor: 'var(--color-surface-card)' }}
                >
                  <span style={{ position: 'absolute', inset: '0 0 0 auto', width: '72%', overflow: 'hidden' }}>
                    <Image
                      src={image}
                      alt={`${festival.name} 로고`}
                      width={880}
                      height={230}
                      sizes="(min-width: 1100px) 486px, 48vw"
                      loading="eager"
                      style={{ position: 'absolute', top: 0, right: 0, display: 'block', width: 'auto', maxWidth: 'none', height: '100%' }}
                    />
                  </span>
                </span>
              </>
            ) : image ? (
              <Image
                src={image}
                alt={`${festival.name} ${dateLabel}`}
                width={880}
                height={230}
                sizes={isDesktop ? '1016px' : '(max-width: 472px) calc(100vw - 32px), 440px'}
                loading="eager"
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            ) : (
              <>
                <Icon name="calendar" size={14} strokeWidth={2} color="currentColor" />
                <span>{festival.name}</span>
                <span style={{ fontWeight: 500, opacity: 0.8, fontFeatureSettings: '"tnum"' }}>
                  {dateLabel}
                </span>
                <Icon name="chevron-right" size={14} strokeWidth={2} color="currentColor" />
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** 누른 바로가기 위에 덮는 "이동하는 중…" — 예매 CTA의 "여는 중…"과 같은 도는 아이콘 */
function PendingOverlay({ compact }: { compact: boolean }) {
  return (
    <span
      role="status"
      style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2)',
        backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 86%, transparent)',
        color: 'var(--color-primary-base)', fontSize: compact ? 'var(--text-meta)' : 'var(--text-body)', fontWeight: 700,
      }}
    >
      <Icon name="loader-circle" size={compact ? 14 : 18} strokeWidth={2} className="booking-cta-spin" />
      영화제로 이동하는 중…
    </span>
  )
}
