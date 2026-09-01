'use client'

import type { ReactNode } from 'react'
import {
  Avatar, Badge, BottomSheet, BubbleTail, Button, Card, CardContainer, Chip, DirectorChip,
  Divider, EmptyState, FabRound, FavoriteButton, FilterPill, GenreChip,
  Icon, IconButton, Input, KakaoLoginButton, ListRow, MenuCard, MenuRow, PosterChip,
  ScrollNavButton, Switch, Tabs,
  SearchBar, SearchBarButton, SectionHeader, Skeleton, SortToggle, Wordmark,
  MovieCardSkeleton, TheaterCardSkeleton,
} from '@/components/primitives'

/* 목록 카드에 올리는 작은 미리보기. 제품 컴포넌트를 그대로 쓰되 한눈에 들어올 만큼만 보여 준다. */

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

/** 포스터 자리 — 오버레이 칩을 보여 줄 때만 쓴다. */
function Poster({ children, width = 84 }: { children?: ReactNode; width?: number }) {
  return (
    <div style={{
      position: 'relative', width, height: width * 1.42, borderRadius: 'var(--radius-poster)',
      background: 'linear-gradient(160deg, var(--color-neutral-600), var(--color-neutral-900))',
    }}>{children}</div>
  )
}

const THUMBS: Record<string, ReactNode> = {
  /* 다이얼로그는 포털로 화면 전체에 뜬다 — 목록 카드에 실물을 띄우면 문서를 덮는다.
     그래서 여기서만 겉모습을 흉내 낸 정지 화면을 쓴다(다른 썸네일은 전부 제품 컴포넌트다). */
  ConfirmDialog: (
    <div style={{
      width: 208, padding: 'var(--spacing-4)', borderRadius: 'var(--radius-popover)',
      background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
      boxShadow: 'var(--elevation-2, 0 8px 24px rgba(0,0,0,0.12))',
      display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)',
    }}>
      <span style={{ fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--color-text-primary)' }}>로그아웃할까요?</span>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm">취소</Button>
        <Button size="sm">로그아웃</Button>
      </div>
    </div>
  ),
  FavoriteButton: (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <FavoriteButton active={false} onToggle={() => {}} size={32} label="견본" />
      <FavoriteButton active onToggle={() => {}} size={44} label="견본" />
      {/* overlay는 포스터 위에서만 뜻이 통한다 — 어두운 면을 깔고 흰 테두리를 보여 준다 */}
      <div style={{ position: 'relative', width: 56, height: 84, borderRadius: 'var(--radius-poster)', background: 'linear-gradient(160deg, #6B5B95, #9B3331)' }}>
        <div style={{ position: 'absolute', top: 4, right: 4 }}>
          <FavoriteButton active={false} onToggle={() => {}} variant="overlay" size={32} label="견본" />
        </div>
      </div>
      <div style={{ position: 'relative', width: 56, height: 84, borderRadius: 'var(--radius-poster)', background: 'linear-gradient(160deg, #EAE5E1, #C6BFB9)' }}>
        <div style={{ position: 'absolute', top: 4, right: 4 }}>
          <FavoriteButton active onToggle={() => {}} variant="overlay" size={32} label="견본" />
        </div>
      </div>
    </div>
  ),
  KakaoLoginButton: (
    <div style={{ width: 200 }}>
      <KakaoLoginButton />
    </div>
  ),
  MenuCard: (
    <div style={{ width: 208 }}>
      <MenuCard style={{ margin: 0 }}>
        <MenuRow icon={<Icon name="heart" size="lg" />} title="관심" />
        <MenuRow icon={<Icon name="bell" size="lg" />} title="알림 설정" last />
      </MenuCard>
    </div>
  ),
  MenuRow: (
    <div style={{ width: 208, background: 'var(--color-surface-card)', borderRadius: 'var(--radius-control)', overflow: 'hidden' }}>
      <MenuRow icon={<Icon name="bell" size="lg" />} title="알림 설정" description="새 상영 소식" />
      <MenuRow icon={<Icon name="x" size="lg" />} title="로그아웃" tone="danger" last />
    </div>
  ),
  Switch: (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Switch checked onChange={() => {}} label="켜짐 견본" />
      <Switch checked={false} onChange={() => {}} label="꺼짐 견본" />
      <Switch checked disabled onChange={() => {}} label="비활성 견본" />
    </div>
  ),
  Icon: (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-primary)' }}>
      <Icon name="map-pin" size="lg" />
      <Icon name="heart" size="lg" />
      <Icon name="calendar" size="lg" />
      <Icon name="search" size="lg" />
    </div>
  ),
  Divider: (
    <div style={{ width: 132, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>씨네큐브 광화문</span>
      <Divider />
      <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>아트나인</span>
    </div>
  ),
  EmptyState: (
    <div style={{ width: 168 }}>
      <EmptyState message="이 날 상영 정보가 없어요" paddingY={12} />
    </div>
  ),
  Tabs: (
    <div style={{ width: 168 }}>
      <TabsThumb />
    </div>
  ),
  ListRow: (
    <div style={{ width: 200 }}>
      <ListRow title="새 상영 알림" description="관심작에 상영이 열리면" trailing={<Switch checked onChange={() => {}} label="새 상영 알림" />} last density="compact" />
    </div>
  ),
  Avatar: (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar name="봉준호" size={28} />
      <Avatar name="홍상수" size={44} />
    </div>
  ),
  Badge: (
    <div style={{ display: 'flex', gap: 6 }}>
      <Badge variant="success">상영중</Badge>
      <Badge variant="error">매진</Badge>
    </div>
  ),
  BottomSheet: (
    <div style={{ position: 'absolute', left: 16, right: 16, bottom: 0 }}>
      <BottomSheet>
        <div style={{ padding: '0 var(--gutter) var(--spacing-6)' }}>
          <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>씨네큐브 광화문</div>
          <div style={{ marginTop: 2, fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>
            오늘 6회 상영
          </div>
        </div>
      </BottomSheet>
    </div>
  ),
  BubbleTail: (
    <div style={{
      position: 'relative', padding: '8px 12px', borderRadius: 'var(--radius-popover)',
      background: 'var(--color-primary-base)', color: 'var(--color-text-inverse)',
      fontSize: 'var(--text-meta)',
    }}>
      서울 상영작
      <BubbleTail dir="up" background="var(--color-primary-base)" />
    </div>
  ),
  Button: (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Button size="sm">예매하기</Button>
      <Button size="sm" variant="secondary">관심</Button>
    </div>
  ),
  Card: (
    <div style={{ width: 168 }}>
      <Card>
        <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>아트나인</div>
        <div style={{ marginTop: 2, fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>오늘 4회 상영</div>
      </Card>
    </div>
  ),
  CardContainer: (
    <div style={{ width: 200 }}>
      <CardContainer padding={12} gap={8}>
        <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>이번 주 GV</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 34, height: 48, borderRadius: 'var(--radius-poster)',
              background: 'var(--color-surface-raised)',
            }} />
          ))}
        </div>
      </CardContainer>
    </div>
  ),
  Chip: (
    <div style={{ display: 'flex', gap: 6 }}>
      <Chip selected>드라마</Chip>
      <Chip>다큐</Chip>
    </div>
  ),
  DirectorChip: (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <DirectorChip name="봉준호" />
    </div>
  ),
  FabRound: <FabRound><IcoPlus /></FabRound>,
  FilterPill: (
    <div style={{ display: 'flex', gap: 6 }}>
      <FilterPill active>예매 가능만</FilterPill>
    </div>
  ),
  GenreChip: (
    <div style={{ display: 'flex', gap: 6 }}>
      <GenreChip>드라마</GenreChip>
      <GenreChip>다큐멘터리</GenreChip>
    </div>
  ),
  IconButton: (
    <div style={{ display: 'flex', gap: 8 }}>
      <IconButton aria-label="추가"><IcoPlus /></IconButton>
      <IconButton aria-label="검색" shape="round"><IcoSearch /></IconButton>
    </div>
  ),
  Input: (
    <div style={{ width: 188 }}>
      <Input label="영화 제목" placeholder="제목을 입력하세요" readOnly />
    </div>
  ),
  MovieCardSkeleton: <div style={{ width: 68 }}><MovieCardSkeleton /></div>,
  PosterChip: (
    <div style={{ transform: 'scale(0.62)' }}>
      <Poster width={150}>
        <PosterChip corner="top-left" tone="gv">GV</PosterChip>
        <PosterChip corner="top-right" tone="error">매진</PosterChip>
      </Poster>
    </div>
  ),
  ScrollNavButton: (
    <div style={{
      position: 'relative', width: 168, height: 56,
      background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-control)',
    }}>
      <ScrollNavButton direction="left" style={{ left: 6 }} />
      <ScrollNavButton direction="right" style={{ right: 6 }} />
    </div>
  ),
  SearchBar: (
    <div style={{ width: 210 }}>
      <SearchBar placeholder="영화, 영화관 검색" readOnly />
    </div>
  ),
  SearchBarButton: (
    <div style={{ width: 200 }}>
      <SearchBarButton placeholder="영화, 영화관 검색" />
    </div>
  ),
  SectionHeader: (
    <div style={{ width: 220 }}>
      <SectionHeader title="오늘의 특별전" emoji="🎞" description="전국 독립·예술영화관" />
    </div>
  ),
  Skeleton: (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <Skeleton width={140} height={14} />
      <Skeleton width={96} height={14} />
      <Skeleton width={44} height={44} rounded="full" />
    </div>
  ),
  SortToggle: (
    <div style={{ display: 'flex', gap: 6 }}>
      <SortToggle active>최신순 ↓</SortToggle>
      <SortToggle>인기순</SortToggle>
    </div>
  ),
  TheaterCardSkeleton: <div style={{ width: 216 }}><TheaterCardSkeleton /></div>,
  Toast: (
    <div style={{
      padding: '10px 16px', borderRadius: 'var(--radius-pill)',
      background: 'var(--color-neutral-900)', color: 'var(--color-text-inverse)',
      fontSize: 'var(--text-meta)', fontWeight: 500,
    }}>
      관심 영화에 담았어요
    </div>
  ),
  Wordmark: <Wordmark style={{ height: 30, width: 'auto' }} />,
}

function TabsThumb() {
  return (
    <Tabs
      label="미리보기"
      value="info"
      onChange={() => {}}
      items={[{ value: 'info', label: '영화 정보' }, { value: 'theaters', label: '상영관' }] as const}
    />
  )
}

export const hasThumb = (name: string) => name in THUMBS

export function ComponentThumb({ name }: { name: string }) {
  const thumb = THUMBS[name]
  if (!thumb) return null
  return <>{thumb}</>
}
