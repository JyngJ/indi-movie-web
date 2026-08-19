'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
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
const IcoClock = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
)
const IcoSearch = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
)

/** 견본 한 칸 — 캡션과 함께 보여 준다. */
function Case({ label, children, dark = false, wide = false }: { label: string; children: ReactNode; dark?: boolean; wide?: boolean }) {
  return (
    // wide — 입력 계열은 내용 폭으로 줄어들면 플레이스홀더가 잘린다. 무대 폭을 그대로 쓴다.
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', width: wide ? '100%' : undefined }}>
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
  // Toast는 position: fixed다. transform이 걸린 조상이 있으면 그 상자가 기준이 되므로
  // 데모에서는 일부러 상자를 하나 만들어 토스트를 견본 안에 가둔다(뷰포트 바닥으로 도망가지 않게).
  return (
    <div style={{
      position: 'relative', transform: 'translateZ(0)',
      width: '100%', height: 180,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <button type="button" className="ds-demo-btn" onClick={() => setN(v => v + 1)}>토스트 띄우기</button>
      <Toast message="관심 영화에 담았어요" trigger={n} />
    </div>
  )
}

function InputDemo() {
  const [v, setV] = useState('')
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)', width: 420, maxWidth: '100%' }}>
      <Input label="영화 제목" placeholder="제목을 입력하세요" value={v} onChange={e => setV(e.target.value)} />
      <Input label="이메일" defaultValue="not-an-email" error="이메일 형식이 아닙니다" />
      <Input label="극장" hint="지역을 함께 적으면 더 잘 찾습니다" leftIcon={<IcoSearch />} />
    </div>
  )
}

function SearchBarDemo() {
  const [v, setV] = useState('')
  return (
    <div style={{ width: 560, maxWidth: '100%' }}>
      <SearchBar
        value={v}
        onChange={e => setV(e.target.value)}
        onClear={() => setV('')}
        placeholder="영화, 영화관, 감독을 검색하세요"
      />
    </div>
  )
}

const RECENT = ['봉준호', '씨네큐브 광화문', '어떻게 해야 했을까?', '전주국제영화제']

function SearchBarButtonDemo() {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const wrap = useRef<HTMLDivElement>(null)

  // 입력칸이 실제로 붙은 다음에 포커스를 준다 — rAF는 커밋보다 빨라서 놓친다.
  useEffect(() => { if (open) ref.current?.focus() }, [open])

  // 바깥을 누르면 닫는다. 제품의 검색 오버레이와 같은 규칙이다.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <div ref={wrap} style={{ position: 'relative', width: 560, maxWidth: '100%' }}>
      {open ? (
        <SearchBar
          ref={ref}
          value={v}
          onChange={e => setV(e.target.value)}
          onClear={() => setV('')}
          inputFontSize={14}
          onClick={() => setOpen(false)}
        />
      ) : (
        <SearchBarButton onClick={() => setOpen(true)} />
      )}

      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(var(--comp-search-height) + var(--spacing-2))',
          background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-control)', boxShadow: 'var(--shadow-md)',
          padding: 'var(--spacing-3)', zIndex: 2,
        }}>
          <div style={{
            fontSize: 'var(--text-badge)', fontWeight: 700, color: 'var(--color-text-caption)',
            padding: '0 var(--spacing-2) var(--spacing-2)',
          }}>최근 검색</div>
          {RECENT.map(r => (
            <div key={r} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)',
              padding: 'var(--spacing-2)', borderRadius: 'var(--radius-button)',
              fontSize: 'var(--text-body)', color: 'var(--color-text-body)',
            }}>
              <span style={{ color: 'var(--color-text-placeholder)', display: 'flex' }}><IcoClock /></span>
              {r}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScrollNavButtonDemo() {
  const rail = useRef<HTMLDivElement>(null)
  // 실제 배치와 같게 — 포스터 레일 위에 좌우로 얹고, 누르면 레일이 한 칸씩 밀린다.
  const nudge = (dir: -1 | 1) => rail.current?.scrollBy({ left: dir * 240, behavior: 'smooth' })
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={rail}
        style={{
          display: 'flex', gap: 'var(--spacing-3)', overflowX: 'auto', scrollbarWidth: 'none',
          padding: '0 var(--spacing-2)', width: '100%', minWidth: 0,
        }}
      >
        {['기억의 빛', '중경삼림', '벌새', '헤어질 결심', '괴물', '패스트 라이브즈', '드라이브 마이 카',
          '가여운 것들', '추락의 해부', '괴물의 아이'].map(t => (
          <div key={t} style={{ flex: '0 0 auto', width: 96 }}>
            <div style={{
              width: 96, height: 136, borderRadius: 'var(--radius-poster)',
              background: 'linear-gradient(160deg, var(--color-neutral-600), var(--color-neutral-900))',
            }} />
            <div style={{
              marginTop: 'var(--spacing-2)', fontSize: 'var(--text-meta)',
              color: 'var(--color-text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{t}</div>
          </div>
        ))}
      </div>
      <ScrollNavButton direction="left" onClick={() => nudge(-1)} style={{ top: 68 }} />
      <ScrollNavButton direction="right" onClick={() => nudge(1)} style={{ top: 68 }} />
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
  CardContainer: (
    <Case label="큐레이션 섹션 판 — 헤더(구분선) + 목록을 한 판에">
      <div style={{ width: 300 }}>
        <CardContainer>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <SectionHeader title="이번 주 GV" description="감독과의 대화가 열리는 상영" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 16px' }}>
            {['기억의 빛', '중경삼림'].map((t, i) => (
              <div key={t} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  width: 54, height: 81, borderRadius: 'var(--radius-poster)', flexShrink: 0,
                  background: 'linear-gradient(160deg, var(--color-neutral-500), var(--color-neutral-800))',
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--color-text-body)' }}>{t}</div>
                  <div style={{ marginTop: 2, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
                    {i === 0 ? '봉준호' : '왕가위'}
                  </div>
                  <div style={{ marginTop: 6 }}><GenreChip>드라마</GenreChip></div>
                </div>
              </div>
            ))}
          </div>
        </CardContainer>
      </div>
    </Case>
  ),
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
  SearchBarButton: (
    <Case label="눌러 보세요 — 검색 화면처럼 입력창과 최근 검색이 열립니다">
      <SearchBarButtonDemo />
    </Case>
  ),
  FabRound: <Case label="원형 FAB"><FabRound><IcoPlus /></FabRound></Case>,
  FabPill: <Case label="pill FAB — 지도·목록 전환"><FabPill /></Case>,
  ScrollNavButton: (
    <Case wide label="포스터 레일 위 실제 배치 — 눌러서 밀어 보세요">
      <ScrollNavButtonDemo />
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
    // 밝은 면·어두운 면을 반반으로 채워 두 색이 각자 어디에 놓이는지 한눈에 보이게 한다.
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%',
      borderRadius: 'var(--radius-control)', overflow: 'hidden',
      border: '1px solid var(--color-border)',
    }}>
      <div style={{
        background: 'var(--color-surface-card)', padding: 'var(--spacing-8) var(--spacing-6)',
        display: 'grid', justifyItems: 'center', gap: 'var(--spacing-4)',
      }}>
        <Wordmark style={{ height: 30, width: 'auto' }} />
        <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', fontFamily: 'var(--font-mono)' }}>
          기본 · 잉크
        </span>
      </div>
      <div style={{
        background: 'var(--color-neutral-800)', padding: 'var(--spacing-8) var(--spacing-6)',
        display: 'grid', justifyItems: 'center', gap: 'var(--spacing-4)',
      }}>
        <Wordmark color="var(--color-text-inverse)" style={{ height: 30, width: 'auto' }} />
        <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-neutral-400)', fontFamily: 'var(--font-mono)' }}>
          어두운 면 · 역상
        </span>
      </div>
    </div>
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
