'use client'

import { useState, type ReactNode } from 'react'
import {
  Avatar, Badge, BottomSheet, BubbleTail, Button, Card, CardContainer, Chip, DirectorChip,
  FabPill, FabRound, FilterPill, GenreChip, IconButton, Input, PosterChip, ScrollNavButton,
  SearchBar, SearchBarButton, SectionHeader, Skeleton, SortToggle, Toast, Wordmark,
  MovieCardSkeleton, TheaterCardSkeleton,
} from '@/components/primitives'

/* 제품 컴포넌트를 그대로 import해 렌더한다 — 문서용 사본을 만들지 않는다. */

const IcoPlus = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const IcoSearch = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
)

/** 견본 한 칸 — 캡션과 함께 보여 준다. */
function Case({ label, children, dark = false }: { label: string; children: ReactNode; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
      <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-3)', alignItems: 'center',
        padding: 'var(--spacing-4)', borderRadius: 'var(--radius-control)',
        background: dark ? 'var(--color-neutral-800)' : 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
      }}>{children}</div>
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>{children}</div>
}

function PosterStage({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: 'relative', width: 120, height: 170, borderRadius: 'var(--radius-poster)',
      background: 'linear-gradient(160deg, var(--color-neutral-600), var(--color-neutral-800))',
    }}>{children}</div>
  )
}

function ToastDemo() {
  const [n, setN] = useState(0)
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setN(v => v + 1)}>토스트 띄우기</Button>
      <Toast message="관심 영화에 담았어요" trigger={n} />
    </>
  )
}

function InputDemo() {
  const [v, setV] = useState('')
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)', width: '100%', maxWidth: 360 }}>
      <Input label="영화 제목" placeholder="제목을 입력하세요" value={v} onChange={e => setV(e.target.value)} />
      <Input label="이메일" defaultValue="not-an-email" error="이메일 형식이 아닙니다" />
      <Input label="극장" hint="지역을 함께 적으면 더 잘 찾습니다" leftIcon={<IcoSearch />} />
    </div>
  )
}

function SearchBarDemo() {
  const [v, setV] = useState('')
  return (
    <div style={{ width: '100%', maxWidth: 520 }}>
      <SearchBar
        value={v}
        onChange={e => setV(e.target.value)}
        onClear={() => setV('')}
        placeholder="영화, 영화관, 감독을 검색하세요"
      />
    </div>
  )
}

/** 컴포넌트 이름 → 데모. 없는 이름은 "데모 없음"으로 표시된다. */
const DEMOS: Record<string, ReactNode> = {
  Button: (
    <Row>
      <Case label="variant">
        <Button variant="primary">예매하기</Button>
        <Button variant="secondary">관심 등록</Button>
        <Button variant="tertiary">더보기</Button>
        <Button variant="text">취소</Button>
        <Button variant="danger">삭제</Button>
      </Case>
      <Case label="size — sm 32 / md 44 / lg 52">
        <Button size="sm">sm</Button>
        <Button size="md">md</Button>
        <Button size="lg">lg</Button>
      </Case>
      <Case label="state">
        <Button loading>로딩</Button>
        <Button disabled>비활성</Button>
        <Button fullWidth>fullWidth</Button>
      </Case>
    </Row>
  ),
  IconButton: (
    <Row>
      <Case label="variant=ghost · shape">
        <IconButton aria-label="추가"><IcoPlus /></IconButton>
        <IconButton aria-label="검색" shape="round"><IcoSearch /></IconButton>
      </Case>
      <Case label="variant=overlay (어두운 면 위)" dark>
        <IconButton aria-label="추가" variant="overlay"><IcoPlus /></IconButton>
        <IconButton aria-label="검색" variant="overlay" shape="round"><IcoSearch /></IconButton>
      </Case>
      <Case label="size 32 / 44 / 52">
        <IconButton aria-label="추가" size={32}><IcoPlus /></IconButton>
        <IconButton aria-label="추가" size={44}><IcoPlus /></IconButton>
        <IconButton aria-label="추가" size={52}><IcoPlus /></IconButton>
      </Case>
    </Row>
  ),
  Chip: (
    <Case label="selected · onDismiss">
      <Chip>독립예술</Chip>
      <Chip selected>독립예술</Chip>
      <Chip selected onDismiss={() => {}}>드라마</Chip>
    </Case>
  ),
  GenreChip: <Case label="장르 표시 전용(비인터랙티브)"><GenreChip>드라마</GenreChip><GenreChip>다큐멘터리</GenreChip></Case>,
  FilterPill: (
    <Case label="active">
      <FilterPill>예매 가능만 보기</FilterPill>
      <FilterPill active>예매 가능만 보기</FilterPill>
    </Case>
  ),
  SortToggle: (
    <Case label="active">
      <SortToggle>최신순 ↓</SortToggle>
      <SortToggle active>최신순 ↓</SortToggle>
    </Case>
  ),
  Badge: (
    <Case label="variant">
      <Badge>기본</Badge>
      <Badge variant="success">상영중</Badge>
      <Badge variant="warning">잔여석 적음</Badge>
      <Badge variant="error">매진</Badge>
    </Case>
  ),
  Avatar: (
    <Case label="size — 이니셜 폴백">
      <Avatar name="봉준호" size={24} />
      <Avatar name="홍상수" size={28} />
      <Avatar name="김보라" size={44} />
    </Case>
  ),
  DirectorChip: <Case label="pending"><DirectorChip name="봉준호" /><DirectorChip name="홍상수" pending /></Case>,
  PosterChip: (
    <Case label="corner · tone — 좌하단은 순위 표기 자리로 비워 둡니다">
      <PosterStage>
        <PosterChip corner="top-left" tone="gv">GV</PosterChip>
        <PosterChip corner="top-right" tone="error">매진</PosterChip>
        <PosterChip corner="bottom-right" tone="scrim">19:30</PosterChip>
      </PosterStage>
    </Case>
  ),
  Card: (
    <Case label="padding · shadow · clickable">
      <Card>기본 카드</Card>
      <Card padding="lg" shadow="md">패딩 lg · 그림자 md</Card>
      <Card clickable>클릭 가능</Card>
    </Case>
  ),
  CardContainer: <Case label="카드 묶음 컨테이너"><CardContainer><Card>1</Card><Card>2</Card></CardContainer></Case>,
  SectionHeader: (
    <Case label="emoji · description · trailing">
      <div style={{ width: '100%' }}>
        <SectionHeader
          title="오늘 상영하는 특별전"
          emoji="🎞"
          description="전국 독립·예술영화관 기준"
          trailing={<SortToggle active>최신순 ↓</SortToggle>}
        />
      </div>
    </Case>
  ),
  Input: <Case label="label · error · hint · leftIcon"><InputDemo /></Case>,
  SearchBar: <Case label="입력 가능 — 직접 타이핑해 보세요"><SearchBarDemo /></Case>,
  SearchBarButton: <Case label="검색창 모양 버튼(탭 전환용)"><SearchBarButton onClick={() => {}} /></Case>,
  FabRound: <Case label="원형 FAB"><FabRound><IcoPlus /></FabRound></Case>,
  FabPill: <Case label="pill FAB — 지도·목록 전환"><FabPill /></Case>,
  ScrollNavButton: (
    <Case label="레일 좌우 이동 — 절대 배치이므로 relative 무대 위에 놓습니다">
      <div style={{ position: 'relative', width: 200, height: 64, background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-control)' }}>
        <ScrollNavButton direction="left" style={{ left: 8 }} />
        <ScrollNavButton direction="right" style={{ right: 8 }} />
      </div>
    </Case>
  ),
  Skeleton: (
    <Row>
      <Case label="width · height · rounded">
        <Skeleton width={160} height={16} />
        <Skeleton width={80} height={80} rounded="lg" />
        <Skeleton width={44} height={44} rounded="full" />
      </Case>
      <Case label="조합 스켈레톤">
        <MovieCardSkeleton />
        <TheaterCardSkeleton />
      </Case>
    </Row>
  ),
  Toast: <Case label="trigger 값을 올리면 표시됩니다"><ToastDemo /></Case>,
  BottomSheet: (
    <Case label="시트 면 — 핸들과 상단 라운드">
      <div style={{ width: 320 }}>
        <BottomSheet>
          <div style={{ padding: 'var(--gutter)', fontSize: 'var(--text-body)', color: 'var(--color-text-body)' }}>
            시트 내용이 들어갑니다
          </div>
        </BottomSheet>
      </div>
    </Case>
  ),
  BubbleTail: (
    <Case label="말풍선 꼬리 — 11×11 정사각 rotate 45">
      <div style={{
        position: 'relative', padding: 'var(--spacing-3) var(--spacing-4)',
        background: 'var(--color-primary-base)', color: 'var(--color-text-inverse)',
        borderRadius: 'var(--radius-popover)', fontSize: 'var(--text-meta)',
      }}>
        서울 지역 상영작만 보는 중
        <BubbleTail dir="up" background="var(--color-primary-base)" />
      </div>
    </Case>
  ),
  Wordmark: (
    <Row>
      <Case label="기본"><Wordmark /></Case>
      <Case label="아웃라인(어두운 면 위)" dark>
        <Wordmark color="var(--color-text-inverse)" />
      </Case>
    </Row>
  ),
}

/** 서버 컴포넌트에서 이름만 넘겨 쓰는 진입점.
 *  DEMOS 객체를 직접 export해 서버에서 읽으면 클라이언트 참조 프록시가 와서 값이 비어 있다. */
export function Demo({ name }: { name: string }) {
  const demo = DEMOS[name]
  return demo ? <>{demo}</> : null
}

/** 목록 페이지에서 데모 유무를 표시할 때 쓴다. */
export function hasDemo(name: string) {
  return name in DEMOS
}
