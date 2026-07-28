/**
 * 화면 표면(Surfaces) — 리디자인 검토용 화면 배경·층위·히어로 조합 재현
 * /dev/components 전용 (감사 제외 대상 — 하드코딩 허용)
 *
 * 각 재현은 원본 화면 코드의 배경 처리·타이포 스택·토큰 사용을 그대로 옮긴
 * 정적 축소판이다. 프롭 의존이 가벼운 프리미티브(SearchBarButton · FabRound ·
 * FilterChip · IlloCollected)는 실컴포넌트 import, 데이터 훅에 묶인 화면부는
 * 갤러리 내 정적 재현.
 */
'use client'

import React, { useEffect, useState } from 'react'
import { SearchBarButton, FabRound } from '@/components/primitives'
import { FilterChip } from '@/components/domain/filterBar/FilterChip'
import { IlloCollected, ONBOARDING_POSTERS } from '@/components/domain/onboarding/illustrations'
import { Section, Entry, Label, captionStyle } from './gallery-shared'

/* ── 갤러리 다크 감지 — 페이지 토글이 뒤집는 data-theme 관찰 ────── */
function useGalleryDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const read = () => setDark(el.getAttribute('data-theme') === 'dark')
    read()
    const mo = new MutationObserver(read)
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return dark
}

/* ── 공통: 모바일 390 근사 프레임 ────────────────────────────────── */
function Frame({
  height,
  label,
  children,
}: {
  height?: number
  label?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      {label && <Label>{label}</Label>}
      <div style={{
        width: '100%', maxWidth: 390, height,
        border: '1px solid var(--color-border)', borderRadius: 12,
        overflow: 'hidden', backgroundColor: 'var(--color-surface-bg)',
        position: 'relative',
      }}>
        {children}
      </div>
    </div>
  )
}

/* ── 공통: 토큰명 라벨 오버레이 ──────────────────────────────────── */
function TokenTag({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 6px', borderRadius: 4,
      fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 600,
      lineHeight: 1.4, whiteSpace: 'nowrap',
      color: 'var(--color-on-accent)',
      backgroundColor: 'color-mix(in srgb, var(--color-primary-base) 82%, transparent)',
      pointerEvents: 'none',
      ...style,
    }}>
      {children}
    </span>
  )
}

/* ── 아이콘 (원본 화면들의 인라인 SVG 재현) ──────────────────────── */
const IcoUser26 = () => <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
const IcoUser24 = () => <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
const IcoShare = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
const IcoMap = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
const IcoPin = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
const IcoPlus = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
const IcoMinus = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M5 12h14" /></svg>
const IcoLocate = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
const IcoArrow = () => <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
const IcoExternal = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><path d="M15 3h6v6M10 14L21 3" /></svg>

/* dev 하드코딩 실물 포스터 — 온보딩과 동일 소스(TMDB) 재사용 */
const DEV_POSTER = ONBOARDING_POSTERS.parasite

/* 지도 근사 배경 — surface 토큰 위에 border 색 그리드 (정적 이미지 없이) */
const mapishBg: React.CSSProperties = {
  backgroundColor: 'var(--color-surface-raised)',
  backgroundImage: `
    linear-gradient(color-mix(in srgb, var(--color-border) 55%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--color-border) 55%, transparent) 1px, transparent 1px)
  `,
  backgroundSize: '44px 44px',
}

/* ── 1. 영화 상세 히어로 ─────────────────────────────────────────── */
/* MovieDetailClient.tsx HeroSection(모바일) + FilmsMovieDetailClient.tsx heroSection의
   배경 그라데이션·포스터 그림자·타이포 스택을 그대로 옮긴 정적 재현 */
function GenreChipHero({ children, films = false }: { children: React.ReactNode; films?: boolean }) {
  return (
    <span style={{
      height: films ? 24 : 22, padding: films ? '0 12px' : '0 9px',
      display: 'inline-flex', alignItems: 'center',
      borderRadius: 9999, fontSize: films ? 12 : 11, fontWeight: 500,
      backgroundColor: 'var(--color-primary-subtle-l)',
      border: '1px solid color-mix(in srgb, var(--color-primary-base) 40%, transparent)',
      color: 'var(--color-primary-base)',
    }}>{children}</span>
  )
}

function MovieHeroMap() {
  return (
    <div style={{
      background: 'var(--color-surface-bg)',
      padding: '24px 20px 20px',
      display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
      <div style={{ flexShrink: 0, width: 96, height: 144 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DEV_POSTER} alt="기생충 포스터" width={96} height={144}
          style={{ borderRadius: 0, objectFit: 'cover', boxShadow: 'inset 0 0 0 1px var(--comp-poster-border)', display: 'block' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}>
          기생충
        </h1>
        <div style={{ marginTop: 4, fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 11, color: 'var(--color-text-caption)', lineHeight: 1.4 }}>
          Parasite
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
          <GenreChipHero>드라마</GenreChipHero>
          <GenreChipHero>스릴러</GenreChipHero>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-sub)', lineHeight: 1.5 }}>
          🇰🇷 한국 · 2019 · 131분
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ color: 'var(--color-warning)', fontSize: 14 }}>★</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', fontFeatureSettings: '"tnum"' }}>9.1</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>&nbsp;/ 10</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-caption)' }}>관객 평점</span>
        </div>
      </div>
    </div>
  )
}

function MovieHeroFilms() {
  return (
    <div style={{
      background: 'var(--color-surface-bg)',
      padding: '24px 16px 20px',
      display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
      <div style={{ flexShrink: 0, width: 100, height: 150 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DEV_POSTER} alt="기생충 포스터" width={100} height={150}
          style={{ borderRadius: 0, objectFit: 'cover', boxShadow: 'inset 0 0 0 1px var(--comp-poster-border)', display: 'block' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}>
          기생충
        </h1>
        <div style={{ marginTop: 4, fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--color-text-caption)' }}>
          Parasite
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <GenreChipHero films>드라마</GenreChipHero>
          <GenreChipHero films>스릴러</GenreChipHero>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-sub)' }}>🇰🇷 한국 · 2019 · 131분</div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* DirectorChip 재현 — 포토 없음 = 아이콘 폴백 */}
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px 8px 8px', borderRadius: 9999, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', cursor: 'pointer', minHeight: 'auto' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)' }}>
              <IcoUser24 />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>봉준호</span>
            <span style={{ fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 500 }}>감독 →</span>
          </button>
          <button aria-label="공유" style={{ width: 'var(--touch-target)', height: 'var(--touch-target)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-body)', cursor: 'pointer', flexShrink: 0 }}>
            <IcoShare />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 2. 표면 층위 스택 ───────────────────────────────────────────── */
function LayerStack() {
  const cellText: React.CSSProperties = { fontSize: 12, color: 'var(--color-text-body)' }
  return (
    <div className="flex flex-col gap-5">
      {/* a. 극장 시트 단면 — 지도(bg) 위 시트(raised) 위 카드(card) */}
      <Frame label="극장 시트 단면 — TheaterSheet: raised 시트 위에 card 카드" height={230}>
        <div style={{ ...mapishBg, position: 'absolute', inset: 0 }} />
        <TokenTag style={{ position: 'absolute', top: 8, left: 8 }}>지도 영역 (surface-raised 근사)</TokenTag>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 170,
          backgroundColor: 'var(--color-surface-raised)',
          borderRadius: 'var(--comp-sheet-radius)',
          boxShadow: 'var(--shadow-sheet)',
          padding: '8px 16px 0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 6 }}>
            <div style={{ width: 'var(--comp-sheet-handle-width)', height: 'var(--comp-sheet-handle-height)', borderRadius: 'var(--comp-sheet-handle-radius)', backgroundColor: 'var(--color-border)' }} />
          </div>
          <TokenTag style={{ position: 'absolute', top: 24, right: 12 }}>--color-surface-raised</TokenTag>
          <p style={{ margin: '2px 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.12, letterSpacing: '-0.2px' }}>더숲 아트시네마</p>
          <div style={{ position: 'relative', borderRadius: 12, backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-border)', padding: 12 }}>
            <TokenTag style={{ position: 'absolute', top: 6, right: 6 }}>--color-surface-card</TokenTag>
            <p style={{ margin: 0, ...cellText, fontWeight: 700, color: 'var(--color-text-primary)' }}>기억의 빛</p>
            <div style={{ marginTop: 8, position: 'relative', display: 'inline-flex', flexDirection: 'column', gap: 2, borderRadius: 8, backgroundColor: 'var(--color-surface-bg)', border: '1px solid var(--color-border)', padding: '6px 10px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>17:00</span>
              <TokenTag style={{ position: 'absolute', top: -8, left: 'calc(100% + 6px)' }}>--color-surface-bg</TokenTag>
            </div>
          </div>
        </div>
      </Frame>

      {/* b. 설정 카드 — bg 패널 위 card 행 위 raised 아이콘 */}
      <Frame label="설정 카드 — SettingsPanel: bg 패널 위 card 행, raised 아이콘 스퀘어">
        <div style={{ backgroundColor: 'var(--color-surface-bg)', padding: 16, position: 'relative' }}>
          <TokenTag style={{ position: 'absolute', top: 6, right: 6 }}>--color-surface-bg</TokenTag>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12 }}>
            <TokenTag style={{ position: 'absolute', bottom: 6, right: 6 }}>--color-surface-card</TokenTag>
            <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 12, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-text-body)' }}>
              <IcoLocate />
              <TokenTag style={{ position: 'absolute', top: -10, left: 0 }}>--color-surface-raised</TokenTag>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>내 위치 사용</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-caption)' }}>가까운 극장부터 보여드려요</p>
            </div>
          </div>
        </div>
      </Frame>

      {/* c. 큐레이션 시트 단면 — bg 지도 위 card 시트, raised 스크롤 힌트 */}
      <Frame label="큐레이션 시트 단면 — CurationSheet: card 시트 위 raised 칩" height={190}>
        <div style={{ ...mapishBg, position: 'absolute', inset: 0 }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 132,
          backgroundColor: 'var(--color-surface-card)',
          borderRadius: 'var(--comp-sheet-radius)',
          boxShadow: 'var(--shadow-sheet)',
          padding: '8px 16px 0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 6 }}>
            <div style={{ width: 'var(--comp-sheet-handle-width)', height: 'var(--comp-sheet-handle-height)', borderRadius: 'var(--comp-sheet-handle-radius)', backgroundColor: 'var(--color-border)' }} />
          </div>
          <TokenTag style={{ position: 'absolute', top: 24, right: 12 }}>--color-surface-card</TokenTag>
          <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>🍿 지금 볼 수 있는 상영작</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', borderRadius: 9999, backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-body)', fontSize: 12 }}>
              오늘 상영
              <TokenTag style={{ position: 'absolute', top: -12, left: 0 }}>--color-surface-raised</TokenTag>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', borderRadius: 9999, backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-body)', fontSize: 12 }}>이번 주</span>
          </div>
        </div>
      </Frame>
    </div>
  )
}

/* ── 2b. 섹션 구분 헤어라인 (큐레이션 시트) ──────────────────────── */
/* CurationSheet SectionDivider — 기존 8px surface 띠를 대체한 종이 카탈로그풍
   1px 풀블리드 라인. 상하 간격은 부모 flex의 SECTION_GAP(16px)이 담당, 그림자 없음.
   섹션 제목은 오른쪽으로 뻗던 가로선 없이 텍스트만 */
function SectionHairlineDemo() {
  const fakeSection = (title: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, padding: '0 16px', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</p>
      <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 84, height: 126, backgroundColor: 'var(--color-surface-raised)', boxShadow: 'inset 0 0 0 1px var(--comp-poster-border)' }} />
        ))}
      </div>
    </div>
  )
  return (
    <Frame label="섹션 사이 풀블리드 1px var(--color-border) — 상하 16px(SECTION_GAP) 리듬 유지 · 제목 옆 가로선 없음">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
        {fakeSection('서울에서 단 한 곳')}
        <div style={{ position: 'relative' }}>
          <div aria-hidden style={{ height: 1, width: '100%', backgroundColor: 'var(--color-border)' }} />
          <TokenTag style={{ position: 'absolute', top: 4, right: 8 }}>--color-border · 1px</TokenTag>
        </div>
        {fakeSection('최근 찾아본')}
      </div>
    </Frame>
  )
}

/* ── 3. 바텀시트 골격 ───────────────────────────────────────────── */
function BottomSheetSkeleton() {
  return (
    <Frame label="핸들 36×4 · 상단 라운딩 --radius-sheet(20px) · --shadow-sheet — 실물 크기" height={210}>
      <div style={{ ...mapishBg, position: 'absolute', inset: 0 }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 150,
        backgroundColor: 'var(--color-surface-card)',
        borderRadius: 'var(--comp-sheet-radius)',
        boxShadow: 'var(--shadow-sheet)',
      }}>
        <div style={{ padding: '8px 0 6px', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 'var(--comp-sheet-handle-width)',
            height: 'var(--comp-sheet-handle-height)',
            borderRadius: 'var(--comp-sheet-handle-radius)',
            backgroundColor: 'var(--color-border)',
          }} />
        </div>
        <TokenTag style={{ position: 'absolute', top: 6, right: 10 }}>--comp-sheet-handle 36×4</TokenTag>
        <TokenTag style={{ position: 'absolute', top: -12, left: 10 }}>--radius-sheet 20px</TokenTag>
        <TokenTag style={{ position: 'absolute', top: -12, right: 10 }}>--shadow-sheet</TokenTag>
        <div style={{ padding: '4px 16px 0' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>시트 콘텐츠 영역</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-caption)' }}>
            TheaterSheet · CurationSheet · BottomSheet 프리미티브가 공유하는 셸 스펙
          </p>
        </div>
      </div>
    </Frame>
  )
}

/* ── 4. 지도 위 오버레이 조합 ────────────────────────────────────── */
function MapOverlayComposition() {
  return (
    <Frame label="모바일 — 검색바(16px 패딩, shadow-sheet 승격) + 필터칩 행 + 우하단 FAB 스택" height={480}>
      <div style={{ ...mapishBg, position: 'absolute', inset: 0 }} />

      {/* 검색바 — MapView: 상단 플로팅, shadow-sheet + comp-search-radius로 승격 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 16px 0' }}>
        <div style={{ boxShadow: 'var(--shadow-sheet)', borderRadius: 'var(--comp-search-radius)' }}>
          <SearchBarButton placeholder="영화, 감독, 역, 영화관 검색" onClick={() => {}} />
        </div>
      </div>

      {/* 필터칩 행 — 검색바 아래 16+44+8 오프셋, 가로 스크롤 */}
      <div className="no-scrollbar" style={{ position: 'absolute', top: 16 + 44 + 8, left: 0, right: 0, display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px' }}>
        <FilterChip label="지역" value="서울 노원구" selected onClick={() => {}} onClear={() => {}} />
        <FilterChip label="날짜" onClick={() => {}} hasDropdown />
        <FilterChip label="국가" onClick={() => {}} hasDropdown />
      </div>

      {/* 줌 + 현위치 FAB — 우하단 세로 스택 (모바일) */}
      <div style={{ position: 'absolute', right: 16, bottom: 96, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <FabRound onClick={() => {}}><IcoPlus /></FabRound>
        <FabRound onClick={() => {}}><IcoMinus /></FabRound>
        <div style={{ height: 8 }} />
        <FabRound onClick={() => {}}><IcoLocate /></FabRound>
      </div>

      {/* 큐레이션 시트 peek — 하단에 살짝 걸치는 층위 감각 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: -28, height: 72,
        backgroundColor: 'var(--color-surface-card)',
        borderRadius: 'var(--comp-sheet-radius)',
        boxShadow: 'var(--shadow-sheet)',
      }}>
        <div style={{ padding: '8px 0 6px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 'var(--comp-sheet-handle-width)', height: 'var(--comp-sheet-handle-height)', borderRadius: 'var(--comp-sheet-handle-radius)', backgroundColor: 'var(--color-border)' }} />
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--color-text-sub)' }}>큐레이션 시트 peek</p>
      </div>
    </Frame>
  )
}

/* ── 5. 페스티벌 배너 + 이름 폴백 ────────────────────────────────── */
function FestivalBanner() {
  return (
    <div className="flex flex-col gap-5">
      <Frame label="상태 A — bannerUrl 로드 성공: 원본 비율 그대로 가로 맞춤(크롭 없음), 배경 surface-raised">
        {/* 원본은 <img src={proxiedImageUrl(bannerUrl,1920)}> — dev에선 실이미지 대신 비율/배경 처리만 재현 */}
        <div style={{
          width: '100%', aspectRatio: '21/6', backgroundColor: 'var(--color-surface-raised)',
          backgroundImage: 'linear-gradient(120deg, color-mix(in srgb, var(--color-primary-base) 30%, transparent) 0%, transparent 55%, color-mix(in srgb, var(--color-warning) 22%, transparent) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: 'var(--color-text-caption)' }}>
            &lt;img&gt; width:100% · height:auto (bannerUrl)
          </span>
        </div>
      </Frame>

      <Frame label="상태 B — 로드 실패/부재: 21:4 surface-raised 박스 + 이름 폴백 (+ 아래 헤더 블록)">
        <div style={{ width: '100%', aspectRatio: '21/4', position: 'relative', backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', textAlign: 'center' }}>
            제27회 전주국제영화제
          </span>
        </div>
        {/* 헤더 블록 — 상태 배지 + 날짜 + 제목 + 장소 + CTA */}
        <div style={{ padding: '20px 16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-accent)', backgroundColor: 'var(--color-success)', padding: '4px 12px', borderRadius: 9999 }}>진행중</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-caption)', fontWeight: 600 }}>4.30(목) – 5.9(토)</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}>
            제27회 전주국제영화제
          </h1>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-caption)' }}>
            <IcoPin /> 전북 · 전주 · 영화의거리 일대
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, backgroundColor: 'var(--color-primary-base)', color: 'var(--color-on-accent)', fontSize: 14, fontWeight: 700 }}>
              공식 사이트 <IcoExternal />
            </span>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text-body)', fontSize: 14, fontWeight: 700 }}>
              <IcoPin /> 지도에서 보기
            </span>
          </div>
        </div>
      </Frame>
    </div>
  )
}

/* ── 6. 감독 히어로 ─────────────────────────────────────────────── */
function DirectorHero({ withPhoto }: { withPhoto: boolean }) {
  return (
    <div style={{
      background: 'var(--color-surface-bg)',
      padding: '32px 16px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ width: 112, height: 112, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
        {withPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={DEV_POSTER} alt="봉준호" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <span style={{ fontSize: 40, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.7)' }}>봉</span>
        )}
      </div>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center' }}>봉준호</h1>
      <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-sub)', fontStyle: 'italic', textAlign: 'center' }}>Bong Joon-ho</div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-caption)' }}>
        <span style={{ color: 'var(--color-primary-base)', fontWeight: 600 }}>상영중 2편</span>
      </div>
      <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
        <button style={{ height: 40, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, border: '1px solid var(--color-primary-base)', backgroundColor: 'var(--color-primary-base)', color: 'var(--color-on-accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <IcoMap /> 지도에서 필터로 보기
        </button>
        <button style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-body)', cursor: 'pointer', flexShrink: 0 }}>
          <IcoShare />
        </button>
      </div>
    </div>
  )
}

/* ── 7. 온보딩 첫 스텝 (모바일 슬라이드) ─────────────────────────── */
function OnboardingFirstStep({ dark }: { dark: boolean }) {
  return (
    <Frame label="모바일 첫 슬라이드 — 실일러(IlloCollected) + 스크림 그라데이션 + 타이포/도트" height={620}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface-bg)' }}>
        {/* 일러 영역 — 실컴포넌트 import (지도 타일 + 포스터 핀) */}
        <div style={{ position: 'relative', overflow: 'hidden', flex: '1 1 0', minHeight: 140 }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <IlloCollected dark={dark} />
          </div>
          {/* 스크림 — 일러가 텍스트 영역으로 자연스럽게 가라앉는 그라데이션 */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, transparent 55%, var(--color-surface-bg) 99%)' }} />
        </div>
        {/* 텍스트 영역 */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '22px 30px 26px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, lineHeight: 1.32, letterSpacing: '-0.4px', color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}>
            전국 독립·예술영화관,<br />다 여기 모았어요
          </div>
          <div style={{ marginTop: 16, fontSize: 17, lineHeight: 1.62, color: 'var(--color-text-sub)', wordBreak: 'keep-all' }}>
            <b style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>178개</b> 극장의 상영 시간표를 매일 모아요. 이제 극장 인스타를 하나하나 뒤질 필요 없어요.
          </div>
          <div style={{ marginTop: 18, fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-caption)', textAlign: 'center', padding: '0 6px', wordBreak: 'keep-all' }}>
            영화볼지도 — 독립·예술영화관 상영 시간표를 지도 한 장에
          </div>
          {/* 도트 — 첫 페이지 활성 */}
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center', marginTop: 14 }}>
            <span style={{ display: 'block', width: 20, height: 7, borderRadius: 999, background: 'var(--color-primary-base)' }} />
            {[1, 2, 3].map((i) => (
              <span key={i} style={{ display: 'block', width: 7, height: 7, borderRadius: 999, background: 'var(--color-border)' }} />
            ))}
          </div>
          {/* 내비 행 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 44, padding: '0 18px', borderRadius: 9999, border: 'none', backgroundColor: 'var(--color-primary-base)', color: 'var(--color-on-accent)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              다음 <IcoArrow />
            </button>
          </div>
        </div>
      </div>
    </Frame>
  )
}

/* ── Section export ─────────────────────────────────────────────── */
export function SurfacesSection() {
  const dark = useGalleryDark()
  return (
    <Section id="sec-surfaces" title="화면 표면 — 배경 · 층위 · 히어로 조합">
      <p style={{ ...captionStyle, textTransform: 'none' }}>
        컴포넌트 낱개가 아니라 화면 단위 표면 처리(배경 그라데이션 · surface 층위 · 히어로 스택)를
        모바일 390 근사 프레임 안에 재현 — 리디자인 검토용. 색은 전부 토큰이라 라이트/다크 토글이 그대로 적용된다.
      </p>

      <Entry id="surf-movie-hero" name="영화 상세 히어로 — 그라데이션 배경 + 타이포 스택"
        screens="영화 상세 (지도 플로우 · films 플로우)" inline
        source="src/app/movie/[id]/MovieDetailClient.tsx (HeroSection) · src/app/films/movie/[id]/FilmsMovieDetailClient.tsx (heroSection)">
        <div className="flex flex-col gap-5">
          <Frame label="지도 플로우 — primary-subtle-l → surface-bg 세로 그라데이션 · 포스터 96×144 · KIMM 제목 21 + 원제 이탤릭 + 장르 칩 + 메타 + 평점">
            <MovieHeroMap />
          </Frame>
          <Frame label="films 플로우 — 동일 그라데이션 · 포스터 100×150 · 감독 칩(아이콘 폴백) + 공유 버튼 행 추가">
            <MovieHeroFilms />
          </Frame>
        </div>
      </Entry>

      <Entry id="surf-layer-stack" name="표면 층위 스택 — surface-bg → raised → card"
        screens="극장 시트 · 설정 패널 · 큐레이션 시트" inline
        source="src/components/domain/TheaterSheet.tsx · src/components/map/SettingsPanel.tsx · src/components/domain/CurationSheet.tsx">
        <LayerStack />
      </Entry>

      <Entry id="surf-section-hairline" name="섹션 구분 — 헤어라인 (1px --color-border)"
        screens="큐레이션 시트(모바일) · 데스크톱 큐레이션 독 (CurationSections 공유)" inline
        source="src/components/domain/CurationSheet.tsx (SectionDivider · Section)">
        <SectionHairlineDemo />
      </Entry>

      <Entry id="surf-bottomsheet" name="바텀시트 골격 — 핸들 + 상단 라운딩 + 그림자"
        screens="극장 시트 · 큐레이션 시트 · BottomSheet 프리미티브" inline
        source="src/styles/tokens.css (--comp-sheet-*) · src/components/primitives/BottomSheet.tsx">
        <BottomSheetSkeleton />
      </Entry>

      <Entry id="surf-map-overlay" name="지도 위 오버레이 조합 — 검색바 · 필터칩 · FAB · 시트 peek"
        screens="지도 (홈)" inline
        source="src/components/map/MapView.tsx (검색바/필터칩/FAB 배치) — SearchBarButton · FilterChip · FabRound는 실컴포넌트">
        <MapOverlayComposition />
      </Entry>

      <Entry id="surf-festival-banner" name="페스티벌 배너 — 이미지 / 이름 폴백 2상태"
        screens="영화제 상세" inline
        source="src/app/festival/[slug]/FestivalDetailClient.tsx (배너 + 헤더 블록)">
        <FestivalBanner />
      </Entry>

      <Entry id="surf-director-hero" name="감독 히어로 — 아바타 + 모노그램 폴백"
        screens="감독 상세 (films)" inline
        source="src/app/films/director/[name]/FilmsDirectorDetailClient.tsx (heroSection)">
        <div className="flex flex-col gap-5">
          <Frame label="photoUrl 있음 — 원형 112 아바타 (objectPosition: top)">
            <DirectorHero withPhoto />
          </Frame>
          <Frame label="photoUrl 없음 — 모노그램 폴백 (font-display 40 · rgba(255,255,255,0.7) — 원본 하드코딩 그대로)">
            <DirectorHero withPhoto={false} />
          </Frame>
        </div>
      </Entry>

      <Entry id="surf-onboarding" name="온보딩 모달 카드 — 첫 스텝"
        screens="첫 방문 오버레이" inline
        source="src/components/domain/onboarding/Onboarding.tsx + onboarding.module.css (모바일 슬라이드 1 · IlloCollected는 실컴포넌트)">
        <OnboardingFirstStep dark={dark} />
      </Entry>
    </Section>
  )
}
