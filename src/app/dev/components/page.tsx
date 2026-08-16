/**
 * 컴포넌트 쇼케이스 — 디자인 토큰 & 컴포넌트 전수 렌더
 * http://localhost:3000/dev/components
 *
 * 이 페이지는 UI 감사 제외 대상(dev/components) — 하드코딩 허용.
 * 렌더 쇼케이스 전용. 스펙 문서는 docs/DESIGN.md 하나만 본다.
 */
'use client'

import { useEffect, useState } from 'react'
import {
  Button, IconButton, SortToggle, Card, CardContainer, Chip, Badge, Input, Toast, GenreChip,
  SectionHeader, ScrollNavButton, Skeleton, MovieCardSkeleton, TheaterCardSkeleton,
  BottomSheet, SearchBar, SearchBarButton, FabRound, FabPill,
} from '@/components/primitives'
import { MapPin, PosterThumb, ShowtimeCell, DateBar, TheaterSheet } from '@/components/domain'
import { FilterChip } from '@/components/domain/filterBar/FilterChip'
import { HoverPopup } from '@/components/domain/CurationSectionRow'
import type { Movie } from '@/types/api'
import { Section, Entry, Label, captionStyle } from './gallery-shared'
import { FoundationsSections } from './foundations'
import { SurfacesSection } from './surfaces'
import { ProposalsSection } from './proposals'
import { MotionSection } from './motion-patterns'
import {
  PosterOverlayChips, RankOverlayRow, ActionBtnRow, MoreButtonRow,
  HoverLiftDemo, PmTipDemo, ToastStatic,
} from './inline-patterns'

/* ── Icons ──────────────────────────────────────────────────────── */
const IcoStar   = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" /></svg>
const IcoPlus   = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
const IcoMinus  = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M5 12h14" /></svg>
const IcoExpand = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
const IcoSearchSm = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
const IcoChevL  = () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
const IcoX      = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>

/* ── 샘플 데이터 ─────────────────────────────────────────────── */
const SAMPLE_DAYS = [
  { dow: '오늘', date: '29', isoDate: '2026-04-29', type: 'today'    as const },
  { dow: '목',   date: '30', isoDate: '2026-04-30', type: 'weekday'  as const },
  { dow: '금',   date: '1',  isoDate: '2026-05-01', type: 'holiday'  as const },
  { dow: '토',   date: '2',  isoDate: '2026-05-02', type: 'saturday' as const },
  { dow: '일',   date: '3',  isoDate: '2026-05-03', type: 'sunday'   as const },
  { dow: '월',   date: '4',  isoDate: '2026-05-04', type: 'weekday'  as const },
  { dow: '화',   date: '5',  isoDate: '2026-05-05', type: 'weekday'  as const },
]

const SAMPLE_MOVIE: Movie = {
  id: 'dev-1',
  title: '기억의 빛',
  year: 2003,
  genre: ['드라마', '미스터리'],
  director: ['봉준호'],
  nation: '한국',
  synopsis: '늦은 밤 노원의 골목, 영사기는 천천히 돌아간다. 오래된 극장에서 상영되는 낡은 필름 속에서 한 남자는 잊고 있던 기억과 마주하게 되는데…',
}

/* ── 화면별 인덱스 데이터 ───────────────────────────────────────── */
const SCREEN_INDEX: { screen: string; source: string; items: { label: string; anchor: string }[] }[] = [
  {
    screen: '지도 (홈)',
    source: 'src/components/map/MapView.tsx · PosterGrid.tsx',
    items: [
      { label: 'SearchBarButton', anchor: 'form-search' },
      { label: 'FabRound / FabPill', anchor: 'btn-fab' },
      { label: 'MapPin', anchor: 'nav-mappin' },
      { label: 'Chip', anchor: 'chip-chip' },
      { label: 'PosterThumb (radius 4 지도 예외)', anchor: 'media-poster' },
      { label: 'pm-tip 호버 카드', anchor: 'media-pmtip' },
      { label: 'Input', anchor: 'form-input' },
    ],
  },
  {
    screen: '극장 시트 (지도 내 바텀시트)',
    source: 'src/components/domain/TheaterSheet.tsx',
    items: [
      { label: 'TheaterSheet', anchor: 'sheet-theatersheet' },
      { label: 'DateBar', anchor: 'nav-datebar' },
      { label: 'ShowtimeCell', anchor: 'nav-showtime' },
      { label: 'PosterThumb', anchor: 'media-poster' },
      { label: 'actionBtn / iconBtn 패턴', anchor: 'btn-action' },
      { label: 'Toast', anchor: 'fb-toast' },
      { label: 'Skeleton', anchor: 'fb-skeleton' },
    ],
  },
  {
    screen: '큐레이션 시트 (지도 내 상영작 시트)',
    source: 'src/components/domain/CurationSheet.tsx',
    items: [
      { label: 'PosterThumb + 거리/정보 오버레이 칩', anchor: 'chip-overlay' },
      { label: '더보기/모두보기 버튼 패턴', anchor: 'btn-more' },
      { label: 'Badge', anchor: 'chip-badge' },
      { label: 'HoverPopup', anchor: 'media-hoverpopup' },
      { label: 'hover-lift', anchor: 'media-hoverlift' },
    ],
  },
  {
    screen: '상영작 탭',
    source: 'src/app/(tabs)/films/FilmsClient.tsx · CurationSectionRow.tsx 등',
    items: [
      { label: 'SearchBar', anchor: 'form-search' },
      { label: 'FilterChip', anchor: 'chip-filter' },
      { label: 'SectionHeader (+ScrollNavButton trailing)', anchor: 'nav-sectionheader' },
      { label: 'ScrollNavButton', anchor: 'btn-scrollnav' },
      { label: 'CardContainer', anchor: 'sheet-cardcontainer' },
      { label: 'GenreChip', anchor: 'chip-genre' },
      { label: 'Badge', anchor: 'chip-badge' },
      { label: 'D-N 오버레이 칩', anchor: 'chip-overlay' },
      { label: 'HoverPopup', anchor: 'media-hoverpopup' },
      { label: 'Skeleton', anchor: 'fb-skeleton' },
    ],
  },
  {
    screen: '영화 상세',
    source: 'src/app/movie/[id]/MovieDetailClient.tsx · films/movie/[id]/FilmsMovieDetailClient.tsx',
    items: [
      { label: 'Button', anchor: 'btn-button' },
      { label: 'Card', anchor: 'sheet-card' },
      { label: 'Chip', anchor: 'chip-chip' },
      { label: 'Toast', anchor: 'fb-toast' },
    ],
  },
  {
    screen: '감독 상세',
    source: 'src/app/director/[name]/DirectorDetailClient.tsx',
    items: [
      { label: 'Chip', anchor: 'chip-chip' },
      { label: 'Toast', anchor: 'fb-toast' },
      { label: 'PosterThumb', anchor: 'media-poster' },
    ],
  },
  {
    screen: '영화제 상세',
    source: 'src/app/festival/[slug]/FestivalDetailClient.tsx',
    items: [
      { label: 'SectionHeader', anchor: 'nav-sectionheader' },
      { label: 'ScrollNavButton', anchor: 'btn-scrollnav' },
      { label: 'PosterThumb', anchor: 'media-poster' },
      { label: 'MapPin', anchor: 'nav-mappin' },
    ],
  },
  {
    screen: '검색 패널',
    source: 'src/components/domain/SearchPanel.tsx · FilmsSearchBar.tsx',
    items: [
      { label: 'SearchBar (인풋 모드)', anchor: 'form-search' },
      { label: 'Input', anchor: 'form-input' },
    ],
  },
  {
    screen: '설정 패널',
    source: 'src/components/map/SettingsPanel.tsx',
    items: [
      { label: 'Input', anchor: 'form-input' },
    ],
  },
  {
    screen: '관리자 콘솔',
    source: 'src/app/admin/*',
    items: [
      { label: 'Button', anchor: 'btn-button' },
      { label: 'Input', anchor: 'form-input' },
      { label: 'Badge', anchor: 'chip-badge' },
    ],
  },
]

const TOC = [
  { anchor: 'tokens-color', label: '토큰 시트' },
  { anchor: 'sec-buttons', label: '버튼' },
  { anchor: 'sec-chips', label: '칩 · 배지' },
  { anchor: 'sec-forms', label: '입력 · 폼' },
  { anchor: 'sec-media', label: '포스터 · 미디어' },
  { anchor: 'sec-nav', label: '내비 · 컨트롤' },
  { anchor: 'sec-sheets', label: '시트 · 카드' },
  { anchor: 'sec-feedback', label: '피드백' },
  { anchor: 'sec-motion', label: '모션' },
  { anchor: 'sec-surfaces', label: '화면 표면' },
  { anchor: 'sec-proposals', label: '리디자인 시안' },
  { anchor: 'sec-screens', label: '화면별 인덱스' },
]

/* ── Page ─────────────────────────────────────────────────────────── */
export default function ComponentsPage() {
  /* 갤러리 한정 라이트/다크 비교 토글 — document.documentElement의 data-theme만 뒤집는다.
     themeStore(로컬스토리지 지속)와 무관한 일회성 로컬 토글 */
  const [galleryTheme, setGalleryTheme] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const cur = document.documentElement.getAttribute('data-theme')
    if (cur === 'dark' || cur === 'light') setGalleryTheme(cur)
  }, [])
  const toggleTheme = () => {
    const next = galleryTheme === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', next)
    setGalleryTheme(next)
  }

  const [searchValue, setSearchValue]           = useState('')
  const [selectedMovie, setSelectedMovie]       = useState('1')
  const [selectedShowtime, setSelectedShowtime] = useState<string | null>('normal-0')
  const [chipOn, setChipOn]                     = useState(true)
  const [toastCount, setToastCount]             = useState(0)
  const [popupOn, setPopupOn]                   = useState(false)
  const [dateSel, setDateSel]                   = useState('29')

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface-bg)' }}>

      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between max-w-xl">
        <div>
          <h1 className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            컴포넌트 쇼케이스
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-caption)' }}>
            디자인 토큰 · 컴포넌트 전수 렌더 — 스펙 문서는 docs/DESIGN.md
          </p>
        </div>
        <button onClick={toggleTheme}
          className="px-3 py-2 rounded-lg text-xs font-semibold border"
          style={{
            backgroundColor: 'var(--color-surface-card)',
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border)',
          }}>
          {galleryTheme === 'light' ? '🌙 다크로 보기' : '☀️ 라이트로 보기'}
        </button>
      </div>

      {/* 목차 */}
      <div className="mb-10 flex gap-2 flex-wrap max-w-xl">
        {TOC.map((t) => (
          <a key={t.anchor} href={`#${t.anchor}`}
            className="px-3 py-1 rounded-full text-xs border"
            style={{
              backgroundColor: 'var(--color-surface-card)',
              color: 'var(--color-text-body)',
              borderColor: 'var(--color-border)',
            }}>
            {t.label}
          </a>
        ))}
      </div>

      <div className="flex flex-col gap-14 max-w-xl">

        {/* ═══ 토큰 시트 ═══════════════════════════════════════════ */}
        <FoundationsSections />

        {/* ═══ 버튼 ═════════════════════════════════════════════════ */}
        <Section id="sec-buttons" title="버튼">

          <Entry id="btn-button" name="Button 2.0 — 5 variant × 4 size (2026-08-08 확정)"
            screens="전 화면 — 인벤토리 297곳 통합 스펙"
            source="src/components/primitives/Button.tsx">
            <div className="flex flex-col gap-3">
              {(['primary', 'secondary', 'tertiary', 'text', 'danger'] as const).map((v) => (
                <div key={v} className="flex items-center gap-3 flex-wrap">
                  <span className="w-[76px]" style={captionStyle}>{v}</span>
                  {(['sm', 'md', 'lg'] as const).map((s) => (
                    <Button key={s} variant={v} size={s}>{v === 'danger' ? '삭제' : '적용하기'}</Button>
                  ))}
                </div>
              ))}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-[76px]" style={captionStyle}>상태</span>
                <Button loading>로딩</Button>
                <Button disabled>비활성</Button>
              </div>
              <div style={{ maxWidth: 358 }}>
                <Button size="full">예매하러 가기 (full 358)</Button>
              </div>
            </div>
          </Entry>

          <Entry id="btn-iconbutton" name="IconButton 2.0 — ghost/overlay × 32/44"
            screens="뒤로가기 · 닫기 × · 지우기 — 아이콘 전용 49곳 통합"
            source="src/components/primitives/IconButton.tsx">
            <div className="flex items-center gap-3 flex-wrap">
              <IconButton variant="ghost" size={32} aria-label="뒤로가기"><IcoChevL /></IconButton>
              <IconButton variant="ghost" size={44} aria-label="뒤로가기"><IcoChevL /></IconButton>
              <IconButton variant="overlay" size={32} aria-label="닫기"><IcoX /></IconButton>
              <IconButton variant="overlay" size={44} aria-label="닫기"><IcoX /></IconButton>
            </div>
          </Entry>

          <Entry id="btn-sorttoggle" name="SortToggle 2.0 — 텍스트 pill h28"
            screens="최신순 정렬 · 예매 가능만 보기"
            source="src/components/primitives/SortToggle.tsx">
            <div className="flex items-center gap-3 flex-wrap">
              <SortToggle>최신순 ↓</SortToggle>
              <SortToggle active>최신순 ↓</SortToggle>
              <SortToggle>예매 가능만</SortToggle>
              <SortToggle active>예매 가능만</SortToggle>
            </div>
          </Entry>

          <Entry id="btn-fab" name="FabRound 44×44 · FabPill"
            screens="지도 (즐겨찾기 · 줌 · 현위치 · 탭 전환)"
            source="src/components/primitives/FAB.tsx">
            <div className="flex items-center gap-3 flex-wrap">
              <FabRound><IcoStar /></FabRound>
              <FabRound><IcoPlus /></FabRound>
              <FabRound><IcoMinus /></FabRound>
              <FabRound><IcoExpand /></FabRound>
              <FabPill />
            </div>
          </Entry>

          <Entry id="btn-scrollnav" name="ScrollNavButton — 32 / 40"
            screens="상영작 탭 큐레이션 행 · 영화제 상세 · 랭킹/인스타 섹션"
            source="src/components/primitives/ScrollNavButton.tsx">
            <div className="relative flex items-center gap-3" style={{ height: 48 }}>
              <ScrollNavButton direction="left" size={32}
                style={{ position: 'static', transform: 'none' }} />
              <ScrollNavButton direction="right" size={32}
                style={{ position: 'static', transform: 'none' }} />
              <ScrollNavButton direction="left" size={40}
                style={{ position: 'static', transform: 'none' }} />
              <ScrollNavButton direction="right" size={40}
                style={{ position: 'static', transform: 'none', opacity: 0.35 }} disabled />
              <span style={captionStyle}>← disabled 0.35</span>
            </div>
          </Entry>

          <Entry id="btn-action" name="actionBtn · iconBtn 패턴"
            screens="극장 시트 (길찾기 · 공유 · 인스타그램 · 닫기)" inline
            source="src/components/domain/TheaterSheet.tsx (actionBtn/iconBtn)">
            <ActionBtnRow />
          </Entry>

          <Entry id="btn-more" name="더보기 / 접기 / 모두보기 버튼 패턴"
            screens="큐레이션 시트 (데스크톱 섹션 확장)" inline
            source="src/components/domain/CurationSheet.tsx (btnStyle)">
            <MoreButtonRow />
          </Entry>
        </Section>

        {/* ═══ 칩 · 배지 ════════════════════════════════════════════ */}
        <Section id="sec-chips" title="칩 · 배지">

          <Entry id="chip-chip" name="Chip — 선택 / 비선택 / dismiss"
            screens="지도 · 영화 상세 · 감독 상세 · 상영작 탭"
            source="src/components/primitives/Chip.tsx">
            <div className="flex items-center gap-2 flex-wrap">
              <Chip selected={chipOn} onClick={() => setChipOn(!chipOn)}>토글해보세요</Chip>
              <Chip selected>선택됨</Chip>
              <Chip>비선택</Chip>
              <Chip selected onDismiss={() => {}}>필터 · 서울</Chip>
            </div>
          </Entry>

          <Entry id="chip-filter" name="FilterChip — 기본 / 열림 / 선택+값 / 드롭다운"
            screens="상영작 탭 필터 바 · 지도 필터"
            source="src/components/domain/filterBar/FilterChip.tsx">
            <div className="flex items-center gap-2 flex-wrap">
              <FilterChip label="지역" onClick={() => {}} hasDropdown />
              <FilterChip label="지역" onClick={() => {}} hasDropdown open />
              <FilterChip label="지역" value="서울 노원구" selected onClick={() => {}} onClear={() => {}} />
              <FilterChip label="오늘 상영" onClick={() => {}} selected value="오늘" onClear={() => {}} separator="·" />
            </div>
          </Entry>

          <Entry id="chip-genre" name="GenreChip"
            screens="상영작 탭 카드 하단 · 큐레이션 행"
            source="src/components/primitives/GenreChip.tsx">
            <div className="flex items-center gap-2 flex-wrap">
              <GenreChip>드라마</GenreChip>
              <GenreChip>미스터리</GenreChip>
              <GenreChip>다큐멘터리</GenreChip>
            </div>
          </Entry>

          <Entry id="chip-badge" name="Badge — 5 variant"
            screens="상영작 탭 · 큐레이션 시트 · 랭킹 섹션 · 관리자 콘솔"
            source="src/components/primitives/Badge.tsx">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>default</Badge>
              <Badge variant="success">success</Badge>
              <Badge variant="warning">warning</Badge>
              <Badge variant="error">error</Badge>
              <Badge variant="info">info</Badge>
            </div>
          </Entry>

          <Entry id="chip-overlay" name="PosterChip — 포스터 오버레이 칩 (전 톤·전 모서리)"
            screens="상영작 탭 (D-N · 개봉 주년) · GV 이벤트 · 극장 시트 (매진) · 인스타 추천 (영화제 상태)"
            source="src/components/primitives/PosterChip.tsx — --text-meta(12)/700 · --comp-poster-chip-pad(8·12) · --radius-badge · offset 6">
            <PosterOverlayChips />
          </Entry>

          <Entry id="chip-rank" name="랭킹 순위 오버레이 — 포스터 좌하단 스크림 + 숫자"
            screens="상영작 탭 (지금 가장 많이 찾는 영화)" inline
            source="src/components/domain/CurationSectionRow.tsx MovieCard(showRank) — 스크림 높이 42% · 숫자 31% · offset 8/4">
            <RankOverlayRow />
          </Entry>
        </Section>

        {/* ═══ 입력 · 폼 ════════════════════════════════════════════ */}
        <Section id="sec-forms" title="입력 · 폼">

          <Entry id="form-input" name="Input — 기본 / 라벨+힌트 / 에러 / 아이콘"
            screens="설정 패널 · 극장 추가 요청 모달 · 피드백 설문 · 검색 패널 · 관리자"
            source="src/components/primitives/Input.tsx">
            <div className="flex flex-col gap-4" style={{ maxWidth: 340 }}>
              <Input placeholder="기본 인풋" />
              <Input label="닉네임" hint="2~10자 한글 또는 영문" placeholder="예: 시네필" />
              <Input label="이메일" error="이메일 형식이 올바르지 않습니다" defaultValue="not-an-email" />
              <Input leftIcon={<IcoSearchSm />} placeholder="아이콘 인풋" />
            </div>
          </Entry>

          <Entry id="form-search" name="SearchBar · SearchBarButton"
            screens="지도 (버튼 모드) · 검색 패널 · 상영작 탭 (인풋 모드)"
            source="src/components/primitives/SearchBar.tsx">
            <div className="flex flex-col gap-3" style={{ maxWidth: 400 }}>
              <Label>버튼 모드 — 클릭 시 검색 페이지 이동</Label>
              <SearchBarButton placeholder="극장 또는 영화 검색" onClick={() => {}} />
              <Label>인풋 모드 — 뒤로가기 포함</Label>
              <SearchBar
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onClear={() => setSearchValue('')}
                onBack={() => {}}
              />
              <Label>인풋 모드 — 값 입력됨 (clear 버튼)</Label>
              <SearchBar value="봉준호" onChange={() => {}} onClear={() => {}} onBack={() => {}} />
            </div>
          </Entry>
        </Section>

        {/* ═══ 포스터 · 미디어 ══════════════════════════════════════ */}
        <Section id="sec-media" title="포스터 · 미디어">

          <Entry id="media-poster" name="PosterThumb — 기본 / 선택 / 강조 / +N / lg / 지도 예외"
            screens="극장 시트 · 상영작 탭 · 큐레이션 시트 · 영화제 · 감독 상세 · 지도 포스터 그리드"
            source="src/components/domain/PosterThumb.tsx">
            <Label>기본 68×102 (--radius-poster)</Label>
            <div className="flex gap-4">
              <PosterThumb width={68} height={102} alt="파과" />
              <PosterThumb width={68} height={102} alt="괴물" />
              <PosterThumb width={68} height={102} />
            </div>
            <Label>선택(체크 배지) · 강조(highlighted — 링만)</Label>
            <div className="flex gap-4">
              <PosterThumb width={68} height={102} selected alt="선택" />
              <PosterThumb width={68} height={102} highlighted alt="강조" />
              <PosterThumb width={68} height={102} />
            </div>
            <Label>+N / 문자열 오버레이</Label>
            <div className="flex gap-4">
              <PosterThumb width={68} height={102} overflow={3} />
              <PosterThumb width={68} height={102} overflow={12} />
              <PosterThumb width={68} height={102} overflow="매진" />
            </div>
            <Label>바텀시트용 lg 96×144 · 지도 예외 radius 4 · radius 0 (큐레이션 카드)</Label>
            <div className="flex gap-4 items-end">
              <PosterThumb width={96} height={144} size="lg" selected alt="lg" />
              <PosterThumb width={56} height={84} radius={4} alt="지도" />
              <PosterThumb width={68} height={102} radius={0} shadow={false} alt="radius 0" />
            </div>
          </Entry>

          <Entry id="media-hoverpopup" name="HoverPopup — 영화 미리보기 카드"
            screens="상영작 탭 · 큐레이션 시트 · 랭킹/감독 특별전 (데스크톱 포스터 hover)"
            source="src/components/domain/CurationSectionRow.tsx (HoverPopup)">
            <div className="flex items-center gap-3">
              <Button size="sm" variant="secondary" onClick={() => setPopupOn(!popupOn)}>
                {popupOn ? '팝업 닫기' : '팝업 띄우기 (뷰포트 좌상단 fixed)'}
              </Button>
              <span style={{ ...captionStyle, textTransform: 'none' }}>
                원본은 포스터 hover 400ms 후 카드 옆에 표시
              </span>
            </div>
            {popupOn && <HoverPopup movie={SAMPLE_MOVIE} x={24} y={96} />}
          </Entry>

          <Entry id="media-hoverlift" name="hover-lift — 공통 호버 클래스"
            screens="상영작 탭 · 큐레이션 시트 · 랭킹 섹션 (클릭 가능한 포스터·아바타)" inline
            source="src/app/globals.css (.hover-lift)">
            <HoverLiftDemo />
          </Entry>

          <Entry id="media-pmtip" name="pm-tip — 지도 포스터 호버 카드"
            screens="지도 (데스크톱 포스터 아일랜드 hover)" inline
            source="src/app/globals.css (.pm-wrap/.pm-tip)">
            <PmTipDemo />
          </Entry>
        </Section>

        {/* ═══ 내비 · 컨트롤 ════════════════════════════════════════ */}
        <Section id="sec-nav" title="내비 · 컨트롤">

          <Entry id="nav-datebar" name="DateBar — 오늘 / 선택 / 요일색 / 비활성 / 상영표시"
            screens="극장 시트 상단 날짜 선택"
            source="src/components/domain/DateBar.tsx">
            <Label>전체 활성 + 좌우 내비 (클릭해 선택 이동 가능)</Label>
            <DateBar days={SAMPLE_DAYS} selectedDate={dateSel} onSelectDate={setDateSel} hasPrev hasNext />
            <Label>일부 disabled (상영 없는 날 — 취소선) + hasSelectedMovie 밑줄</Label>
            <DateBar
              days={SAMPLE_DAYS.map((d, i) => ({
                ...d,
                disabled: i === 1 || i === 5,
                hasSelectedMovie: i === 2 || i === 3,
              }))}
              selectedDate="29"
            />
          </Entry>

          <Entry id="nav-showtime" name="ShowtimeCell — 6 kind"
            screens="극장 시트 상영시간표"
            source="src/components/domain/ShowtimeCell.tsx">
            <div className="flex gap-3 flex-wrap">
              {([
                { id: 'normal-0', label: '기본',       kind: 'normal'     as const, start: '17:00', end: '19:09', avail: 62, total: 172, screen: '5관 (Laser)', promo: '컬처데이' },
                { id: 'low-0',    label: '잔여석 적음', kind: 'low'        as const, start: '20:00', end: '22:05', avail: 13, total: 172, screen: '3관' },
                { id: 'sold-0',   label: '매진',        kind: 'soldout'    as const, start: '14:00', end: '16:09', avail: 0,  total: 172, screen: '1관' },
                { id: 'late-0',   label: '심야',        kind: 'late'       as const, start: '24:00', end: '26:09', avail: 62, total: 172, screen: '2관' },
                { id: 'now-0',    label: '상영중',      kind: 'nowplaying' as const, start: '11:30', end: '13:39', avail: 40, total: 172, screen: '1관' },
                { id: 'end-0',    label: '상영 완료',   kind: 'ended'      as const, start: '09:00', end: '11:09', avail: 88, total: 172, screen: '1관' },
              ]).map((c) => (
                <div key={c.id}>
                  <p className="mb-2" style={captionStyle}>{c.label}</p>
                  <ShowtimeCell
                    startTime={c.start} endTime={c.end}
                    seatAvailable={c.avail} seatTotal={c.total} promo={c.promo}
                    kind={c.kind}
                    selected={selectedShowtime === c.id}
                    onClick={() => setSelectedShowtime(c.id)}
                  />
                </div>
              ))}
            </div>
          </Entry>

          <Entry id="nav-mappin" name="MapPin — indie / selected / 멀티플렉스"
            screens="지도 · 영화제 상세 약도"
            source="src/components/domain/MapPin.tsx (감사 제외 파일)">
            <div className="flex gap-8 flex-wrap items-end p-6 rounded-xl" style={{ backgroundColor: '#d4d0c8' }}>
              {[
                { kind: 'indie' as const, label: '더숲 아트시네마', sub: 'indie default' },
                { kind: 'indie' as const, label: '아트나인', selected: true, sub: 'indie selected' },
                { kind: 'cgv'   as const, label: 'CGV 강변',  sub: 'cgv' },
                { kind: 'mega'  as const, label: '메가박스',   sub: 'mega' },
                { kind: 'lotte' as const, label: '롯데시네마', sub: 'lotte' },
              ].map((p) => (
                <div key={p.sub} className="flex flex-col items-center gap-1">
                  <MapPin kind={p.kind} label={p.label} selected={p.selected} />
                  <span style={{ ...captionStyle, color: '#555' }}>{p.sub}</span>
                </div>
              ))}
            </div>
          </Entry>

          <Entry id="nav-sectionheader" name="SectionHeader — 모바일 / 데스크톱 / trailing"
            screens="상영작 탭 · 영화제 상세 · 큐레이션 행 · 인스타 섹션"
            source="src/components/primitives/SectionHeader.tsx">
            <div className="flex flex-col gap-5">
              <div style={{ border: '1px dashed var(--color-border)', borderRadius: 8, padding: '12px 0' }}>
                <SectionHeader emoji="🎬" title="모바일 헤더" description="설명은 제목 아래 별도 줄" />
              </div>
              <div style={{ border: '1px dashed var(--color-border)', borderRadius: 8, padding: '12px 0' }}>
                <SectionHeader
                  isDesktop
                  emoji="🏆"
                  title="데스크톱 헤더 + trailing"
                  description="trailing은 제목+설명 블록 세로 중앙"
                  trailing={
                    <div className="flex gap-2">
                      <ScrollNavButton direction="left" size={32} style={{ position: 'static', transform: 'none', boxShadow: 'none' }} />
                      <ScrollNavButton direction="right" size={32} style={{ position: 'static', transform: 'none', boxShadow: 'none' }} />
                    </div>
                  }
                />
              </div>
            </div>
          </Entry>
        </Section>

        {/* ═══ 시트 · 카드 ══════════════════════════════════════════ */}
        <Section id="sec-sheets" title="시트 · 카드">

          <Entry id="sheet-card" name="Card — padding / shadow / clickable"
            screens="영화 상세 (films)"
            source="src/components/primitives/Card.tsx">
            <div className="flex gap-4 flex-wrap">
              <Card padding="sm" shadow="none" style={{ width: 150 }}>
                <p className="text-[12px]" style={{ color: 'var(--color-text-body)' }}>sm · shadow none</p>
              </Card>
              <Card padding="md" shadow="sm" style={{ width: 150 }}>
                <p className="text-[12px]" style={{ color: 'var(--color-text-body)' }}>md · shadow sm</p>
              </Card>
              <Card padding="lg" shadow="lg" bordered={false} clickable style={{ width: 150 }}>
                <p className="text-[12px]" style={{ color: 'var(--color-text-body)' }}>lg · shadow lg · clickable</p>
              </Card>
            </div>
          </Entry>

          <Entry id="sheet-cardcontainer" name="CardContainer"
            screens="상영작 탭 compact 큐레이션 (2열 묶음)"
            source="src/components/primitives/CardContainer.tsx">
            <CardContainer padding={16} gap={8} style={{ maxWidth: 320 }}>
              <p className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>섹션 묶음 컨테이너</p>
              <p className="text-[12px]" style={{ color: 'var(--color-text-caption)' }}>
                border + --radius-control + surface-card. 내부 스크롤 영역을 감쌀 때 사용.
              </p>
            </CardContainer>
          </Entry>

          <Entry id="sheet-bottomsheet" name="BottomSheet — 핸들바 셸"
            screens="(프리미티브 셸 — TheaterSheet/CurationSheet가 자체 구현으로 동일 스펙 사용)"
            source="src/components/primitives/BottomSheet.tsx">
            <div style={{ maxWidth: 360 }}>
              <BottomSheet>
                <div style={{ padding: '0 16px' }}>
                  <p className="text-[14px] font-bold" style={{ color: 'var(--color-text-primary)' }}>시트 콘텐츠</p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-caption)' }}>
                    상단 radius --radius-sheet(20px) · 핸들바 36×4
                  </p>
                </div>
              </BottomSheet>
            </div>
          </Entry>

          <Entry id="sheet-theatersheet" name="TheaterSheet — 극장 카드 (실컴포넌트)"
            screens="지도 (핀 선택 시 바텀시트)"
            source="src/components/domain/TheaterSheet.tsx">
            <div style={{ position: 'relative', height: 400, overflow: 'hidden', borderRadius: 16, background: '#e0ddd6' }}>
              <TheaterSheet
                theater={{ id: 'dev', name: '더숲 아트시네마', address: '서울특별시 노원구 화랑로 123', lat: 37.6, lng: 127.0, city: '서울', createdAt: '', updatedAt: '' }}
                expanded={false}
                selectedMovieId={selectedMovie}
                onMovieSelect={setSelectedMovie}
                onExpand={() => {}}
                onCollapse={() => {}}
                onClose={() => {}}
              />
            </div>
          </Entry>
        </Section>

        {/* ═══ 피드백 ═══════════════════════════════════════════════ */}
        <Section id="sec-feedback" title="피드백 — Toast · Skeleton">

          <Entry id="fb-toast" name="Toast"
            screens="극장 시트 (복사됨) · 영화/감독 상세 (저장 확인)"
            source="src/components/primitives/Toast.tsx">
            <Label>정적 배치 재현 (원본은 화면 하단 fixed)</Label>
            <ToastStatic message="복사되었습니다" />
            <div className="flex items-center gap-3 mt-1">
              <Button size="sm" variant="secondary" onClick={() => setToastCount((c) => c + 1)}>
                실제 Toast 트리거
              </Button>
              <span style={{ ...captionStyle, textTransform: 'none' }}>1.6초 후 자동 사라짐</span>
            </div>
            <Toast message="복사되었습니다" trigger={toastCount} />
          </Entry>

          <Entry id="fb-skeleton" name="Skeleton — 3종 + 프리셋"
            screens="상영작 탭 로딩 · 극장 시트 로딩 · 상세 페이지 loading.tsx"
            source="src/components/primitives/Skeleton.tsx">
            <Label>기본 3종 — bar(sm) / 포스터(md) / 원형(full)</Label>
            <div className="flex items-end gap-4">
              <Skeleton width={140} height={14} rounded="sm" />
              <Skeleton width={68} height={102} rounded="md" />
              <Skeleton width={44} height={44} rounded="full" />
            </div>
            <Label>MovieCardSkeleton</Label>
            <div style={{ maxWidth: 160 }}><MovieCardSkeleton /></div>
            <Label>TheaterCardSkeleton</Label>
            <div style={{ maxWidth: 320 }}><TheaterCardSkeleton /></div>
          </Entry>
        </Section>

        {/* ═══ 화면 표면 ════════════════════════════════════════════ */}
        {/* ═══ 모션 ════════════════════════════════════════════════ */}
        <MotionSection />

        <SurfacesSection />

        {/* ═══ 리디자인 시안 ════════════════════════════════════════ */}
        <ProposalsSection />

        {/* ═══ 화면별 인덱스 ════════════════════════════════════════ */}
        <Section id="sec-screens" title="화면별 인덱스 — 화면 → 사용 컴포넌트">
          <div className="flex flex-col gap-5">
            {SCREEN_INDEX.map((s) => (
              <div key={s.screen}
                className="rounded-[12px] border p-4 flex flex-col gap-2"
                style={{ backgroundColor: 'var(--color-surface-card)', borderColor: 'var(--color-border)' }}>
                <p className="text-[14px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.screen}</p>
                <p className="font-mono" style={{ ...captionStyle, textTransform: 'none', fontSize: 10 }}>{s.source}</p>
                <div className="flex gap-2 flex-wrap">
                  {s.items.map((it) => (
                    <a key={`${s.screen}-${it.label}`} href={`#${it.anchor}`}
                      className="px-2 py-1 rounded-full text-[11px] border"
                      style={{
                        backgroundColor: 'var(--color-surface-raised)',
                        color: 'var(--color-text-body)',
                        borderColor: 'var(--color-border)',
                      }}>
                      {it.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p style={{ ...captionStyle, textTransform: 'none' }}>
            모달·설문류(AddRequestModal · FeedbackSurvey · LocationPermissionModal · SettingsPanel)는
            상태 의존이 커서 갤러리 렌더 제외 — 각 파일 참고.
          </p>
        </Section>

      </div>
    </div>
  )
}
