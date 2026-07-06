'use client'

// ================================
// Onboarding — 첫 방문 4페이지 오버레이
// 모바일: 풀스크린 + 좌우 스와이프(CSS scroll-snap) + 도트 동기화 + 얕은 패럴랙스
// 데스크톱: 중앙 모달(880×520, 좌측 일러 420px) + "다음" 버튼
// 위치 권한은 4페이지 CTA에서만 — useLocationPermission(전역 store) 재사용
// ================================

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheaters } from '@/lib/supabase/queries'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useIsDark } from '@/hooks/useIsDark'
import { useLocationPermission } from '@/hooks/useLocationPermission'
import { markOnboardingSeen } from '@/lib/onboarding'
import { storageAdapter } from '@/lib/adapters/storage'
import { trackEvent } from '@/lib/analytics/client'
import {
  IcArrow,
  IcAward,
  IcCal,
  IcHistory,
  IcLock,
  IcPin,
  IcSearch,
  IcSparkle,
  IlloCollected,
  IlloCuration,
  IlloLocation,
  IlloMapDetail,
  type IconProps,
} from './illustrations'
import s from './onboarding.module.css'

const PAGE_COUNT = 4

interface PageDef {
  Illo: ComponentType<{ dark?: boolean }>
  head: ReactNode
  hero?: boolean
  sub?: ReactNode
  footnote?: string
  reassure?: string
  bullets?: Array<[ComponentType<IconProps>, string]>
  cta?: boolean
}

interface Props {
  onClose: () => void
}

export function Onboarding({ onClose }: Props) {
  const isDesktop = useIsDesktopLayout()
  const isDark = useIsDark()
  const router = useRouter()
  const pathname = usePathname()
  const { request: requestLocation, dismiss: dismissLocation, suppressModal: suppressLocationModal } = useLocationPermission()
  // 온보딩 뒤에서 카탈로그 로딩이 미리 진행되도록 theaters 캐시를 여기서도 구독
  const { data: theaters } = useTheaters()
  const theaterCount = theaters?.length ?? 0

  const [page, setPage] = useState(0)
  const pageRef = useRef(0)
  pageRef.current = page
  const viewedRef = useRef<Set<number>>(new Set())
  const closedRef = useRef(false)
  const swipeRef = useRef<HTMLDivElement | null>(null)
  const illoRefs = useRef<Array<HTMLDivElement | null>>([])

  /* ── analytics: 페이지 첫 노출마다 1회 ── */
  useEffect(() => {
    if (viewedRef.current.has(page)) return
    viewedRef.current.add(page)
    trackEvent('onboarding viewed', { page: page + 1 })
  }, [page])

  /* ── 닫기 공통: 플래그 기록 (1회 보장) ── */
  const close = useCallback(() => {
    if (closedRef.current) return
    closedRef.current = true
    void markOnboardingSeen(storageAdapter)
    // 온보딩이 위치 유도를 전담했으므로 지도/상영작 탭의 권한 팝업 중복 억제
    suppressLocationModal()
    onClose()
  }, [onClose, suppressLocationModal])

  const goToMap = useCallback(() => {
    if (pathname !== '/') router.push('/')
  }, [pathname, router])

  const handleSkip = useCallback(() => {
    if (closedRef.current) return
    trackEvent('onboarding skipped', { page: pageRef.current + 1 })
    close()
  }, [close])

  /** CTA(주): 위치 켜고 시작하기 — 닫은 뒤 브라우저 권한 프롬프트, 허용 시 지도가 내 위치로 이동 */
  const handleLocationCta = useCallback(() => {
    if (closedRef.current) return
    trackEvent('onboarding completed', { cta: 'location' })
    close()
    goToMap()
    void requestLocation()
  }, [close, goToMap, requestLocation])

  /** CTA(부): 위치 없이 둘러보기 — 권한 프롬프트 없이 기본(서울) 뷰, 지도 위치 팝업도 생략 */
  const handleBrowseCta = useCallback(() => {
    if (closedRef.current) return
    trackEvent('onboarding completed', { cta: 'browse' })
    dismissLocation()
    close()
    goToMap()
  }, [close, dismissLocation, goToMap])

  /* ── ESC = 건너뛰기 ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSkip])

  /* ── 스와이프 스크롤 → 도트 동기화 + 얕은 패럴랙스 (일러스트가 최대 12px 뒤늦게) ── */
  const handleScroll = useCallback(() => {
    const el = swipeRef.current
    if (!el || !el.clientWidth) return
    const width = el.clientWidth
    const idx = Math.min(PAGE_COUNT - 1, Math.max(0, Math.round(el.scrollLeft / width)))
    if (idx !== pageRef.current) setPage(idx)
    illoRefs.current.forEach((node, i) => {
      if (!node) return
      const delta = el.scrollLeft - i * width
      const lag = Math.max(-12, Math.min(12, delta * 0.032))
      node.style.transform = `translateX(${lag}px)`
    })
  }, [])

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.min(PAGE_COUNT - 1, Math.max(0, idx))
      const el = swipeRef.current
      if (el && el.clientWidth) {
        el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
      } else {
        setPage(clamped)
      }
    },
    [],
  )

  /* ── 페이지 정의 (카피는 디자인 확정본) ── */
  const countText: ReactNode =
    theaterCount > 0 ? (
      <>
        <b>{theaterCount}개</b> 극장의
      </>
    ) : (
      <>전국 극장의</>
    )

  const pages: PageDef[] = [
    {
      Illo: IlloCollected,
      head: (
        <>
          전국 독립·예술영화관,
          <br />다 여기 모았어요
        </>
      ),
      sub: <>{countText} 상영 시간표를 매일 모아요. 이제 극장 인스타를 하나하나 뒤질 필요 없어요.</>,
      footnote: '영화볼지도 — 독립·예술영화관 상영 시간표를 지도 한 장에',
    },
    {
      Illo: IlloCuration,
      head: (
        <>
          오늘 뭘 볼까,
          <br />고민부터 재미있게
        </>
      ),
      bullets: [
        [IcHistory, '곧 내려가는 영화, 오랜만에 돌아온 영화를 먼저 알려드려요'],
        [IcSparkle, '한 감독의 작품이 모이면 자동으로 특별전으로 묶여요'],
        [IcAward, '칸·베니스·아카데미 수상작 중 지금 볼 수 있는 것만 골라서'],
      ],
    },
    {
      Illo: IlloMapDetail,
      head: (
        <>
          영화를 고르면,
          <br />극장이 보여요
        </>
      ),
      bullets: [
        [IcPin, '핀의 포스터 = 지금 그 극장에서 상영 중인 영화'],
        [IcSearch, '영화 제목, 감독, 지하철역 — 뭘로 검색해도 찾아져요'],
        [IcCal, '날짜를 바꿔가며 이번 주 상영을 미리 볼 수 있어요'],
      ],
    },
    {
      Illo: IlloLocation,
      hero: true,
      head: (
        <>
          어디에 계신지
          <br />알려주세요!
        </>
      ),
      sub: '가까운 극장부터, 지금 출발하면 볼 수 있는 상영부터 보여드릴게요.',
      reassure: '위치는 극장을 찾는 데만 쓰고, 저장하지 않아요',
      cta: true,
    },
  ]

  const dots = (
    <div className={s.dots}>
      {pages.map((_, i) => (
        <button
          key={i}
          type="button"
          className={s.dotBtn}
          aria-label={`${i + 1}번째 페이지로 이동`}
          aria-current={i === page ? 'true' : undefined}
          onClick={() => goTo(i)}
        >
          <span className={`${s.dot} ${i === page ? s.dotOn : ''}`} />
        </button>
      ))}
    </div>
  )

  const renderBody = (p: PageDef) => (
    <>
      {p.sub && <div className={`${s.sub} ${isDesktop ? s.mSub : ''}`}>{p.sub}</div>}
      {p.reassure && (
        <div className={s.reassure}>
          <IcLock size={13} />
          {p.reassure}
        </div>
      )}
      {p.bullets && (
        <div className={s.bullets}>
          {p.bullets.map(([Icon, text]) => (
            <div key={text} className={s.bul}>
              <span className={s.bicon}>
                <Icon size={16} />
              </span>
              <span className={s.btext}>{text}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )

  /* ── 데스크톱: 중앙 모달 ── */
  if (isDesktop) {
    const p = pages[page]
    const isLast = page === PAGE_COUNT - 1
    return (
      <div className={`${s.root} ${s.desktopRoot}`} role="dialog" aria-modal="true" aria-label="영화볼지도 소개">
        <div className={s.modal}>
          <button type="button" className={s.mSkip} onClick={handleSkip}>
            건너뛰기
          </button>
          <div className={s.mIllo} key={`illo-${page}`}>
            <p.Illo dark={isDark} />
          </div>
          <div className={s.mText} key={`text-${page}`}>
            <div className={`${s.head} ${s.mHead}`}>{p.head}</div>
            {renderBody(p)}
            <div className={s.spacer} />
            {p.footnote && <div className={`${s.footnote} ${s.mFootnote}`}>{p.footnote}</div>}
            <div className={s.mFooter}>
              <button
                type="button"
                className={s.mPrevBtn}
                onClick={() => goTo(page - 1)}
                style={{ visibility: page === 0 ? 'hidden' : 'visible' }}
              >
                <IcArrow size={16} /> 이전
              </button>
              {dots}
              {isLast ? (
                <div className={s.mCtas}>
                  <button type="button" className={s.ctaGhost} onClick={handleBrowseCta}>
                    위치 없이<br />둘러보기
                  </button>
                  <button type="button" className={s.nextBtn} onClick={handleLocationCta}>
                    위치 켜고<br />시작하기
                  </button>
                </div>
              ) : (
                <button type="button" className={s.nextBtn} onClick={() => goTo(page + 1)}>
                  다음 <IcArrow size={17} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── 모바일: 풀스크린 스와이프 ── */
  return (
    <div className={`${s.root} ${s.mobileRoot}`} role="dialog" aria-modal="true" aria-label="영화볼지도 소개">
      <button type="button" className={s.skip} onClick={handleSkip}>
        건너뛰기
      </button>
      <div className={s.swipe} ref={swipeRef} onScroll={handleScroll}>
        {pages.map((p, i) => (
          <div className={s.slide} key={i}>
            <div className={s.illo}>
              <div
                className={s.illoInner}
                ref={(node) => {
                  illoRefs.current[i] = node
                }}
              >
                <p.Illo dark={isDark} />
              </div>
              <div className={s.scrim} />
            </div>
            <div className={s.textarea}>
              <div className={`${s.head} ${p.hero ? s.headHero : ''}`}>{p.head}</div>
              {renderBody(p)}
              {p.footnote && <div className={s.footnote}>{p.footnote}</div>}
              {dots}
              {p.cta ? (
                <div className={s.ctablock}>
                  <button type="button" className={s.cta} onClick={handleLocationCta}>
                    위치 켜고 시작하기
                  </button>
                  <div className={s.mobNavRow}>
                    <button type="button" className={s.mobNavPrev} onClick={() => goTo(i - 1)}>
                      <IcArrow size={15} /> 이전
                    </button>
                    <button type="button" className={s.ctaSub} onClick={handleBrowseCta}>
                      위치 없이 둘러보기
                    </button>
                  </div>
                </div>
              ) : (
                <div className={s.mobNavRow}>
                  <button
                    type="button"
                    className={s.mobNavPrev}
                    onClick={() => goTo(i - 1)}
                    style={{ visibility: i === 0 ? 'hidden' : 'visible' }}
                  >
                    <IcArrow size={15} /> 이전
                  </button>
                  <button type="button" className={s.mobNavNext} onClick={() => goTo(i + 1)}>
                    다음 <IcArrow size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
