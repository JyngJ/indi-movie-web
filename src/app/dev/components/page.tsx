/**
 * 컴포넌트 쇼케이스 — 디자인 토큰 & 컴포넌트 전체 확인
 * http://localhost:3000/dev/components
 */
'use client'

import { useState } from 'react'
import { Chip, SearchBar, FabRound } from '@/components/primitives'
import { MapPin, PosterThumb, ShowtimeCell, DateBar, TheaterSheet } from '@/components/domain'
import { useThemeStore } from '@/store/themeStore'

/* ── Icons ──────────────────────────────────────────────────────── */
const IcoStar   = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" /></svg>
const IcoPlus   = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
const IcoMinus  = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14" /></svg>
const IcoExpand = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>

/* ── 샘플 데이터 ─────────────────────────────────────────────── */
const SAMPLE_DAYS = [
  { dow: '오늘', date: '29', type: 'today'    as const },
  { dow: '목',   date: '30', type: 'weekday'  as const },
  { dow: '금',   date: '1',  type: 'holiday'  as const },
  { dow: '토',   date: '2',  type: 'saturday' as const },
  { dow: '일',   date: '3',  type: 'sunday'   as const },
  { dow: '월',   date: '4',  type: 'weekday'  as const },
  { dow: '화',   date: '5',  type: 'weekday'  as const },
]

const SAMPLE_MOVIES = [
  { id: '1', title: '파과',      director: '오멸' },
  { id: '2', title: '소풍',      director: '이준익' },
  { id: '3', title: '수라',      director: '장윤미' },
  { id: '4', title: '비밀의 언덕', director: '박두호' },
]

/* ── Foundation colors ───────────────────────────────────────────── */
const FOUNDATION_COLORS = [
  {
    label: 'primary',
    swatches: [
      { name: 'base',         hex: '#4A6380', role: '독립관 핀 · 활성 칩 · CTA · 오늘 강조' },
      { name: 'hover-light',  hex: '#5C7896', role: '라이트 hover/press · 토요일 dow' },
      { name: 'hover-dark',   hex: '#3A5068', role: '다크 hover/press' },
      { name: 'subtle-light', hex: '#E8EEF4', role: '활성 칩 배경(라이트)' },
      { name: 'subtle-dark',  hex: '#1A2530', role: '활성 칩 배경(다크) · 심야 배지 배경' },
    ],
  },
  {
    label: 'multiplex (핀 전용, 텍스트 미사용)',
    swatches: [
      { name: 'cgv',   hex: '#E30613', role: 'CGV' },
      { name: 'mega',  hex: '#6C1E9F', role: '메가박스' },
      { name: 'lotte', hex: '#ED1C24', role: '롯데시네마' },
    ],
  },
  {
    label: 'semantic',
    swatches: [
      { name: 'warning', hex: '#D97706', role: '잔여석 적음 · D-1 배지' },
      { name: 'success', hex: '#4A7C59', role: '예매 완료 · 저장 확인' },
      { name: 'error',   hex: '#B94A48', role: '매진 · 에러 · 일/공휴일' },
    ],
  },
  {
    label: 'neutral',
    swatches: [
      { name: '50',  hex: '#F8F6F2', role: 'page bg(라이트) · dark Primary text' },
      { name: '100', hex: '#F0EDE6', role: 'raised surface · 비활성 칩 배경' },
      { name: '200', hex: '#DDD9CF', role: '보더(라이트) · 핸들바 · dark Body' },
      { name: '400', hex: '#A9A39A', role: 'placeholder(라이트) · dark Sub' },
      { name: '500', hex: '#857F76', role: 'Caption — 라이트·다크 동일 고정' },
      { name: '600', hex: '#635D55', role: '주소·보조 · dark Placeholder' },
      { name: '700', hex: '#4A4540', role: '본문 · 아이콘(라이트)' },
      { name: '800', hex: '#2E2A25', role: '강한 텍스트' },
      { name: '900', hex: '#1A1714', role: '대제목 · light Primary text' },
    ],
  },
  {
    label: 'surface — light',
    swatches: [
      { name: 'page',   hex: '#F8F6F2', role: '최하단 페이지 배경' },
      { name: 'card',   hex: '#FFFFFF',  role: '카드 · 시트 · 시간표 셀' },
      { name: 'raised', hex: '#F0EDE6', role: '비활성 칩 · 스크롤 영역 hint' },
      { name: 'border', hex: '#DDD9CF', role: '1px 구분선 · 핸들바' },
    ],
  },
  {
    label: 'surface — dark',
    swatches: [
      { name: 'page',   hex: '#0E0D0B', role: '최하단 페이지 배경' },
      { name: 'card',   hex: '#1A1814', role: '카드 · 날짜 바' },
      { name: 'raised', hex: '#242019', role: '시트 · 셀' },
      { name: 'border', hex: '#2C2820', role: '1px 구분선' },
    ],
  },
]

/* ── Typography spec ─────────────────────────────────────────────── */
const TYPE_SPEC = [
  /* RIDIBatang */
  { font: 'RIDIBatang',        size: 24, weight: 700, color: '#1A1714', sample: '기억의 빛, 작은 극장에서',                    role: '영화 대제목 h1' },
  { font: 'RIDIBatang',        size: 20, weight: 700, color: '#1A1714', sample: '더숲 아트시네마',                              role: '극장명 h3' },
  { font: 'RIDIBatang',        size: 16, weight: 400, color: '#4A4540', sample: '늦은 밤 노원의 골목, 영사기는 천천히 돌아간다.', role: '리디바탕 본문' },
  { font: 'RIDIBatang',        size: 13, weight: 700, color: '#1A1714', sample: '파과',                                          role: '썸네일 영화명' },
  /* Libre Baskerville — italic 없음 */
  { font: 'Libre Baskerville', size: 18, weight: 400, color: '#1A1714', sample: 'The Light of Memory',                          role: '영문 원제' },
  { font: 'Libre Baskerville', size: 13, weight: 400, color: '#635D55', sample: 'dir. Joon-ho Bong, 2003',                      role: '감독명 / 연도' },
  { font: 'Libre Baskerville', size: 10, weight: 400, color: '#857F76', sample: 'A Bong Joon-ho Film',                          role: '썸네일 원제 (xs)' },
  /* Pretendard */
  { font: 'Pretendard',        size: 17, weight: 700, color: '#1A1714', sample: '17 / 700 — 카드 제목 Title',                   role: 'title' },
  { font: 'Pretendard',        size: 14, weight: 500, color: '#4A4540', sample: '14 / 500 — 본문 Body',                         role: 'body' },
  { font: 'Pretendard',        size: 13, weight: 400, color: '#635D55', sample: '13 / 400 — 메타·주소 Meta',                    role: 'meta' },
  { font: 'Pretendard',        size: 11, weight: 500, color: '#857F76', upper: true, ls: '0.4px', sample: '11 / 500 — CAPTION', role: 'caption caps' },
  { font: 'Pretendard',        size:  9, weight: 700, color: '#D97706', upper: true, ls: '0.4px', sample: '9 / 700 — D-1 BADGE', role: 'badge' },
]

/* ── Page ─────────────────────────────────────────────────────────── */
export default function ComponentsPage() {
  const { theme, setTheme } = useThemeStore()
  const [selectedChip, setSelectedChip]     = useState('독립영화관')
  const [searchValue, setSearchValue]       = useState('')
  const [selectedMovie, setSelectedMovie]   = useState('1')
  const [selectedShowtime, setSelectedShowtime] = useState<string | null>('normal-0')
  const [favorited, setFavorited]           = useState(false)

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface-bg)' }}>

      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)' }}>
            컴포넌트 쇼케이스
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-caption)' }}>
            디자인 토큰 · 컴포넌트 전체 확인
          </p>
        </div>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button key={t} onClick={() => setTheme(t)}
              className="px-3 py-1 rounded text-xs border"
              style={{
                backgroundColor: theme === t ? 'var(--color-primary-base)' : 'var(--color-surface-card)',
                color: theme === t ? '#FFFFFF' : 'var(--color-text-caption)',
                borderColor: 'var(--color-border)',
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-12 max-w-xl">

        {/* ═══ FOUNDATIONS ═══════════════════════════════════════════ */}

        {/* 색상 */}
        <Section title="Foundations — 색상">
          {FOUNDATION_COLORS.map((group) => (
            <div key={group.label}>
              <p className="mb-2" style={captionStyle}>{group.label}</p>
              <div className="flex flex-col gap-[6px]">
                {group.swatches.map((s) => (
                  <div key={s.name}
                    className="flex items-center gap-3 py-2 px-[10px] rounded-[6px] border"
                    style={{ backgroundColor: 'rgba(255,255,255,0.55)', borderColor: 'rgba(0,0,0,0.06)' }}>
                    <div className="w-9 h-9 rounded-[5px] flex-shrink-0 border border-black/[0.08]"
                      style={{ backgroundColor: s.hex }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-semibold block" style={{ color: 'var(--color-text-primary)' }}>
                        {s.name}
                      </span>
                      <span className="font-mono" style={{ ...captionStyle, fontSize: 10 }}>{s.hex}</span>
                    </div>
                    <span className="text-right max-w-[180px]" style={captionStyle}>{s.role}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* 타이포그래피 */}
        <Section title="Foundations — 타이포그래피">
          <div className="flex flex-col gap-[14px]">
            {TYPE_SPEC.map((t, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                <p style={captionStyle}>
                  {t.font} · {t.size}px / {t.weight}{t.upper ? ' uppercase' : ''} — {t.role}
                </p>
                <p style={{
                  fontFamily: t.font === 'RIDIBatang'
                    ? 'var(--font-serif)'
                    : t.font === 'Libre Baskerville'
                    ? 'var(--font-serif-en)'
                    : 'var(--font-sans)',
                  fontSize: t.size,
                  fontWeight: t.weight,
                  color: t.color,
                  letterSpacing: t.ls ?? 'normal',
                  textTransform: t.upper ? 'uppercase' : 'none',
                  lineHeight: 1.4,
                }}>
                  {t.sample}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══ COMPONENTS ═════════════════════════════════════════════ */}

        {/* 01 검색창 */}
        <Section title="01 · 검색창">
          <SearchBar
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClear={() => setSearchValue('')}
          />
          {/* 값 있는 상태 — readOnly로 경고 없이 표시 */}
          <SearchBar
            defaultValue="봉준호"
            onClear={() => {}}
          />
        </Section>

        {/* 02 필터 칩 */}
        <Section title="02 · 필터 칩">
          <div className="flex flex-wrap gap-[6px]">
            {['날짜/시간 구간', '독립영화관', '장르'].map((label) => (
              <Chip key={label} selected={selectedChip === label}
                onClick={() => setSelectedChip(label)}>
                {label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-[6px]">
            <Chip selected onDismiss={() => {}}>오늘 18시 이후</Chip>
            <Chip selected>독립영화관</Chip>
            <Chip>장르</Chip>
          </div>
        </Section>

        {/* 03 지도 핀 */}
        <Section title="03 · 지도 핀">
          <div className="flex gap-8 flex-wrap items-end">
            {[
              { kind: 'indie' as const, label: '더숲 아트시네마', sub: 'indie default' },
              { kind: 'indie' as const, label: '아트나인', selected: true, sub: 'indie selected' },
              { kind: 'cgv'   as const, label: 'CGV 강변',    sub: 'cgv' },
              { kind: 'mega'  as const, label: '메가박스',     sub: 'mega' },
              { kind: 'lotte' as const, label: '롯데시네마',   sub: 'lotte' },
            ].map((p) => (
              <div key={p.sub} className="flex flex-col items-center gap-1">
                <MapPin kind={p.kind} label={p.label} selected={p.selected} />
                <span style={captionStyle}>{p.sub}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 04 포스터 썸네일 */}
        <Section title="04 · 포스터 썸네일">
          {/* gap을 충분히 키워 선택 링이 옆 카드를 밀지 않도록 */}
          <Label>기본 (68×102, radius 6px)</Label>
          <div className="flex gap-4">
            <PosterThumb width={68} height={102} />
            <PosterThumb width={68} height={102} />
            <PosterThumb width={68} height={102} />
          </div>

          <Label>선택됨 — 외곽 링(box-shadow) + 체크 배지</Label>
          <div className="flex gap-4">
            <PosterThumb width={68} height={102} selected />
            <PosterThumb width={68} height={102} selected />
            <PosterThumb width={68} height={102} />
          </div>

          <Label>+N 오버레이</Label>
          <div className="flex gap-4">
            <PosterThumb width={68} height={102} overflow={3} />
            <PosterThumb width={68} height={102} overflow={12} />
          </div>

          <Label>바텀시트용 (96×144, radius 8px)</Label>
          <div className="flex gap-4">
            <PosterThumb width={96} height={144} size="lg" selected />
            <PosterThumb width={96} height={144} size="lg" />
            <PosterThumb width={96} height={144} size="lg" />
          </div>
        </Section>

        {/* 05 바텀시트 — 극장 카드 */}
        <Section title="05 · 바텀시트 — 극장 카드">
          <TheaterSheet
            name="더숲 아트시네마"
            address="서울특별시 노원구 화랑로 123"
            movies={SAMPLE_MOVIES}
            favorited={favorited}
            selectedMovieId={selectedMovie}
            onFavorite={() => setFavorited(!favorited)}
            onMovieSelect={setSelectedMovie}
          />
        </Section>

        {/* 06 날짜 선택 바 */}
        <Section title="06 · 날짜 선택 바">
          <DateBar days={SAMPLE_DAYS} />
        </Section>

        {/* 07 상영시간표 셀 */}
        <Section title="07 · 상영시간표 셀">
          <div className="flex gap-3 flex-wrap">
            {([
              { id: 'normal-0', label: '기본',       kind: 'normal'  as const, start: '17:00', end: '19:09', avail: 62,  total: 172, screen: '5관 (Laser)', promo: '컬처데이' },
              { id: 'low-0',    label: '잔여석 적음', kind: 'low'     as const, start: '20:00', end: '22:05', avail: 13,  total: 172, screen: '3관' },
              { id: 'sold-0',   label: '매진',        kind: 'soldout' as const, start: '14:00', end: '16:09', avail: 0,   total: 172, screen: '1관' },
              { id: 'late-0',   label: '심야',        kind: 'late'    as const, start: '24:00', end: '26:09', avail: 62,  total: 172, screen: '2관' },
            ]).map((c) => (
              <div key={c.id}>
                <p className="mb-2" style={captionStyle}>{c.label}</p>
                <ShowtimeCell
                  startTime={c.start} endTime={c.end}
                  seatAvailable={c.avail} seatTotal={c.total}
                  screenName={c.screen} promo={c.promo}
                  kind={c.kind}
                  selected={selectedShowtime === c.id}
                  onClick={() => setSelectedShowtime(c.id)}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* 10 FAB */}
        <Section title="10 · Floating 버튼">
          <Label>Round 44×44</Label>
          <div className="flex gap-3">
            <FabRound><IcoStar /></FabRound>
            <FabRound><IcoPlus /></FabRound>
            <FabRound><IcoMinus /></FabRound>
            <FabRound><IcoExpand /></FabRound>
          </div>

        </Section>

      </div>
    </div>
  )
}

/* ── 헬퍼 컴포넌트 ─────────────────────────────────────────────── */
const captionStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-caption)',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  fontWeight: 500,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold border-b pb-2"
        style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={captionStyle}>{children}</p>
}
