'use client'

import type { ReactNode } from 'react'
import {
  Avatar, Badge, BottomSheet, Button, Card, Chip, FabRound, FilterPill,
  IconButton, Input, PosterChip, SectionHeader, SortToggle, Toast,
} from '@/components/primitives'
import { useState } from 'react'
import { GUIDES } from '@/design-system/guides'
import { Anatomy, DocSection, SpecRow, Stage, UsageCards } from './shell'
import { Playground, type Control, type ControlValues } from './Playground'
import { Demo, hasDemo } from './demos'
import { ComponentThumb, hasThumb } from './thumbs'

/* 컴포넌트 상세의 시각 자료. 문장은 guides.ts, 값은 매니페스트, 견본은 이 파일에서 정의한다. */

// 버튼 크기를 바꾸면 글리프도 같이 커져야 한다 — 44 기준 18px, 즉 버튼의 약 0.41배.
const IcoPlus = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const IcoExternal = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4h6v6M20 4l-8 8M18 14v6H4V6h6" />
  </svg>
)
const IcoX = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

/** Anatomy 히어로의 번호 콜아웃.
 *  숫자는 파트가 실제로 있는 자리를 가리켜야 한다 — 컴포넌트를 통째로 감싸면
 *  어느 부분을 말하는지 알 수 없다. 그래서 지시선을 파트 위치(x 비율)에 놓는다. */
interface Marker {
  n: number
  /** 컴포넌트 폭에서 가리킬 지점(0~1) */
  at: number
  side?: 'top' | 'bottom'
}

function Figure({ markers, children }: { markers: Marker[]; children: ReactNode }) {
  const dot = (n: number) => (
    <span style={{
      width: 18, height: 18, borderRadius: '50%', background: 'var(--color-neutral-900)',
      color: 'var(--color-text-inverse)', fontSize: 10, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>{n}</span>
  )

  return (
    <div style={{ position: 'relative', display: 'inline-block', padding: '34px 0' }}>
      {children}
      {markers.map(m => {
        const top = m.side === 'bottom'
        return (
          <span
            key={m.n}
            style={{
              position: 'absolute', left: `${m.at * 100}%`, transform: 'translateX(-50%)',
              [top ? 'top' : 'bottom']: '100%',
              display: 'flex', flexDirection: top ? 'column-reverse' : 'column',
              alignItems: 'center', gap: 4,
              marginTop: top ? -34 : undefined, marginBottom: top ? undefined : -34,
            }}
          >
            {dot(m.n)}
            <span style={{ width: 1, height: 16, borderLeft: '1px dashed var(--color-neutral-400)' }} />
          </span>
        )
      })}
    </div>
  )
}

function PosterStage({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: 'relative', width: 132, height: 188, borderRadius: 'var(--radius-poster)',
      background: 'linear-gradient(160deg, var(--color-neutral-600), var(--color-neutral-900))',
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
    <div style={{ display: 'grid', gap: 'var(--spacing-4)', width: '100%', maxWidth: 420 }}>
      <Input label="영화 제목" placeholder="제목을 입력하세요" value={v} onChange={e => setV(e.target.value)} />
      <Input label="이메일" defaultValue="not-an-email" error="이메일 형식이 아닙니다" />
    </div>
  )
}

interface Doc {
  hero?: ReactNode
  playground?: {
    controls: Control[]
    render: (v: ControlValues, set: (k: string, val: string | boolean) => void) => ReactNode
    tone?: 'paper' | 'dark'
  }
  specVisuals?: ReactNode[]
  usageVisuals?: ReactNode[]
}

const s = (v: ControlValues, k: string) => String(v[k])
const b = (v: ControlValues, k: string) => Boolean(v[k])


/**
 * 반례 전용 글리프 — 레지스트리에 넣지 않는다.
 * "쓰지 말라"고 보여주는 아이콘을 레지스트리에 등록하면 다음 사람이 그걸 쓸 수 있게 된다.
 * 문서 안에서만 쓰이므로 여기서 직접 그린다.
 */
function AmbiguousGlyph({ shape }: { shape: 'star' | 'sparkles' }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      {shape === 'star'
        ? <path d="M11.5 3.2 14 8.3l5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4-3.9 5.6-.8z" />
        : <>
            <path d="M9 3.5 10.3 7 13.8 8.3 10.3 9.6 9 13.1 7.7 9.6 4.2 8.3 7.7 7z" />
            <path d="M17.5 12.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
          </>}
    </svg>
  )
}

/** 타깃이 겹치는지는 아이콘만 봐서는 안 보인다 — 44 영역을 점선으로 드러낸다. */
function TargetPair({ gap, caption, bad }: { gap: number; caption: string; bad?: boolean }) {
  const ring = bad ? 'var(--color-error)' : 'var(--color-success)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-3)' }}>
      <div style={{ display: 'flex', gap }}>
        {[<IcoX key="x" />, <IcoPlus key="p" />].map((glyph, i) => (
          <div key={i} style={{ outline: `1px dashed ${ring}`, outlineOffset: -1, borderRadius: 'var(--radius-button)' }}>
            <IconButton aria-label={i === 0 ? '닫기' : '추가'}>{glyph}</IconButton>
          </div>
        ))}
      </div>
      <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>{caption}</span>
    </div>
  )
}

const DOCS: Record<string, Doc> = {
  Button: {
    hero: (
      <Figure markers={[{ n: 1, at: 0.62 }, { n: 2, at: 0.24, side: 'bottom' }]}>
        <Button>
          <IcoExternal />
          예매하러 가기
        </Button>
      </Figure>
    ),
    playground: {
      controls: [
        { kind: 'radio', name: 'variant', label: 'Variant', options: ['primary', 'secondary', 'tertiary', 'text', 'danger'] },
        { kind: 'radio', name: 'size', label: 'Size', options: ['sm', 'md', 'lg'], initial: 'md' },
        { kind: 'toggle', name: 'loading', label: 'Loading' },
        { kind: 'toggle', name: 'disabled', label: 'Disabled' },
        { kind: 'toggle', name: 'fullWidth', label: 'Full width' },
        { kind: 'text', name: 'label', label: '레이블', initial: '예매하러 가기' },
      ],
      render: v => (
        <div style={{ width: b(v, 'fullWidth') ? '100%' : undefined }}>
          <Button
            variant={s(v, 'variant') as 'primary'}
            size={s(v, 'size') as 'md'}
            loading={b(v, 'loading')}
            disabled={b(v, 'disabled')}
            fullWidth={b(v, 'fullWidth')}
          >
            {s(v, 'label')}
          </Button>
        </div>
      ),
    },
    specVisuals: [
      <div key="h" style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-3)' }}>
        <Button size="sm">sm 32</Button>
        <Button size="md">md 44</Button>
        <Button size="lg">lg 52</Button>
      </div>,
      <div key="p" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', alignItems: 'center' }}>
        <Button size="sm">16</Button>
        <Button size="md">32</Button>
        <Button size="lg">48</Button>
      </div>,
      <div key="f" style={{ width: '100%', maxWidth: 260 }}>
        <Button fullWidth>예매하러 가기</Button>
      </div>,
    ],
    usageVisuals: [
      <div key="do" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <Button variant="text">닫기</Button>
        <Button>예매하러 가기</Button>
      </div>,
      <div key="dont" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <Button>예매하기</Button>
        <Button>공유하기</Button>
      </div>,
    ],
  },

  IconButton: {
    hero: (
      <Figure markers={[{ n: 1, at: 0.5, side: 'bottom' }]}>
        <IconButton aria-label="추가"><IcoPlus /></IconButton>
      </Figure>
    ),
    playground: {
      controls: [
        { kind: 'radio', name: 'variant', label: 'Variant', options: ['ghost', 'overlay'] },
        { kind: 'radio', name: 'shape', label: 'Shape', options: ['square', 'round'] },
        { kind: 'radio', name: 'size', label: 'Size', options: ['32', '44', '52'], initial: '44' },
      ],
      render: v => (
        <div style={{
          padding: 'var(--spacing-6)', borderRadius: 'var(--radius-control)',
          background: s(v, 'variant') === 'overlay' ? 'var(--color-neutral-800)' : 'transparent',
        }}>
          <IconButton
            aria-label="추가"
            variant={s(v, 'variant') as 'ghost'}
            shape={s(v, 'shape') as 'square'}
            size={Number(s(v, 'size')) as 44}
          >
            <IcoPlus size={Math.round(Number(s(v, 'size')) * 0.41)} />
          </IconButton>
        </div>
      ),
    },
    specVisuals: [
      <div key="s" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
        <IconButton aria-label="추가" size={32}><IcoPlus size={13} /></IconButton>
        <IconButton aria-label="추가" size={44}><IcoPlus size={18} /></IconButton>
        <IconButton aria-label="추가" size={52}><IcoPlus size={21} /></IconButton>
      </div>,
      <div key="o" style={{
        display: 'flex', gap: 'var(--spacing-3)', padding: 'var(--spacing-4)',
        background: 'var(--color-neutral-800)', borderRadius: 'var(--radius-control)',
      }}>
        <IconButton aria-label="닫기" variant="overlay"><IcoX /></IconButton>
        <IconButton aria-label="추가" variant="overlay" shape="round"><IcoPlus /></IconButton>
      </div>,
    ],
    usageVisuals: [
      <TargetPair key="do" gap={12} caption="간격 12 — 두 타깃이 떨어져 있다" />,
      <TargetPair key="dont-gap" gap={0} caption="간격 0 — 44 타깃이 서로 닿는다" bad />,
      <div key="dont-glyph" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <IconButton aria-label="별"><AmbiguousGlyph shape="star" /></IconButton>
          <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>즐겨찾기? 평점?</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <IconButton aria-label="반짝임"><AmbiguousGlyph shape="sparkles" /></IconButton>
          <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>추천? 새로고침?</span>
        </div>
      </div>,
    ],
  },

  Chip: {
    hero: (
      <Figure markers={[{ n: 1, at: 0.34 }, { n: 2, at: 0.82, side: 'bottom' }]}>
        <Chip selected onDismiss={() => {}}>드라마</Chip>
      </Figure>
    ),
    playground: {
      controls: [
        { kind: 'toggle', name: 'selected', label: 'Selected', initial: true },
        { kind: 'toggle', name: 'dismiss', label: '해제 버튼' },
        { kind: 'text', name: 'label', label: '레이블', initial: '독립예술' },
      ],
      // 칩을 직접 눌러도 선택이 토글된다 — 실제 동작과 같고, 컨트롤 패널이 그 결과를 그대로 비춘다.
      render: (v, set) => (
        <Chip
          selected={b(v, 'selected')}
          onClick={() => set('selected', !b(v, 'selected'))}
          onDismiss={b(v, 'dismiss') ? () => set('selected', false) : undefined}
        >
          {s(v, 'label')}
        </Chip>
      ),
    },
    specVisuals: [
      <div key="r" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <Chip>다큐멘터리</Chip><Chip selected>드라마</Chip>
      </div>,
      <div key="sel" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <Chip>미선택</Chip><Chip selected>선택</Chip>
      </div>,
    ],
    usageVisuals: [
      <div key="do" style={{ display: 'flex', gap: 'var(--spacing-2)', overflow: 'hidden' }}>
        <Chip selected>드라마</Chip><Chip>다큐</Chip><Chip>애니</Chip><Chip>실험</Chip>
      </div>,
      <div key="dont" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <Chip selected>예매하러 가기</Chip>
      </div>,
    ],
  },

  FilterPill: {
    playground: {
      controls: [
        { kind: 'toggle', name: 'active', label: 'Active' },
        { kind: 'text', name: 'label', label: '레이블', initial: '예매 가능만 보기' },
      ],
      render: v => <FilterPill active={b(v, 'active')}>{s(v, 'label')}</FilterPill>,
    },
    specVisuals: [
      <div key="a" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <FilterPill>예매 가능만 보기</FilterPill>
        <FilterPill active>예매 가능만 보기</FilterPill>
      </div>,
    ],
    usageVisuals: [
      <FilterPill key="do" active>예매 가능만 보기</FilterPill>,
      <span key="dont" style={{
        border: '1px solid var(--color-primary-base)', borderRadius: 'var(--radius-pill)',
        padding: '6px 12px', fontSize: 'var(--text-meta)', fontWeight: 600,
        color: 'var(--color-text-sub)',
      }}>예매 가능만 보기</span>,
    ],
  },

  PosterChip: {
    hero: (
      <PosterStage>
        <PosterChip corner="top-left" tone="gv">GV</PosterChip>
        <PosterChip corner="top-right" tone="error">매진</PosterChip>
        <PosterChip corner="bottom-right" tone="scrim">19:30</PosterChip>
      </PosterStage>
    ),
    playground: {
      controls: [
        { kind: 'radio', name: 'corner', label: 'Corner', options: ['top-left', 'top-right', 'bottom-right'] },
        { kind: 'radio', name: 'tone', label: 'Tone', options: ['error', 'warning', 'success', 'gv', 'primary', 'scrim'] },
        { kind: 'text', name: 'label', label: '레이블', initial: '매진' },
      ],
      render: v => (
        <PosterStage>
          <PosterChip corner={s(v, 'corner') as 'top-left'} tone={s(v, 'tone') as 'error'}>
            {s(v, 'label')}
          </PosterChip>
        </PosterStage>
      ),
    },
    specVisuals: [
      <PosterStage key="off">
        <PosterChip corner="top-left" tone="gv">GV</PosterChip>
      </PosterStage>,
      <PosterStage key="rank">
        <div style={{
          position: 'absolute', inset: 'auto 0 0 0', height: '42%',
          background: 'linear-gradient(transparent, rgba(15,12,9,0.78))',
          borderRadius: '0 0 var(--radius-poster) var(--radius-poster)',
        }} />
        <div style={{
          position: 'absolute', left: 8, bottom: 4, fontFamily: 'var(--font-display)',
          fontSize: 58, lineHeight: 1, color: 'var(--color-text-inverse)', fontWeight: 700,
        }}>1</div>
      </PosterStage>,
    ],
    usageVisuals: [
      <PosterStage key="do">
        <PosterChip corner="top-left" tone="gv">GV</PosterChip>
        <PosterChip corner="top-right" tone="error">매진</PosterChip>
      </PosterStage>,
      <PosterStage key="dont">
        <PosterChip corner="bottom-left" tone="warning">잔여 4석</PosterChip>
      </PosterStage>,
    ],
  },

  Badge: {
    playground: {
      controls: [
        { kind: 'radio', name: 'variant', label: 'Variant', options: ['default', 'success', 'warning', 'error'] },
        { kind: 'text', name: 'label', label: '레이블', initial: '상영중' },
      ],
      render: v => <Badge variant={s(v, 'variant') as 'default'}>{s(v, 'label')}</Badge>,
    },
    specVisuals: [
      <div key="r" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <Badge variant="success">상영중</Badge><Badge variant="error">매진</Badge>
      </div>,
    ],
    usageVisuals: [
      <Badge key="do" variant="warning">잔여 4석</Badge>,
      <Badge key="dont">자세히 보기 →</Badge>,
    ],
  },

  Card: {
    playground: {
      controls: [
        { kind: 'radio', name: 'padding', label: 'Padding', options: ['sm', 'md', 'lg'], initial: 'md' },
        { kind: 'radio', name: 'shadow', label: 'Shadow', options: ['none', 'sm', 'md', 'lg'], initial: 'sm' },
        { kind: 'toggle', name: 'bordered', label: 'Bordered', initial: true },
        { kind: 'toggle', name: 'clickable', label: 'Clickable' },
      ],
      render: v => (
        <div style={{ width: 260 }}>
          <Card
            padding={s(v, 'padding') as 'md'}
            shadow={s(v, 'shadow') as 'sm'}
            bordered={b(v, 'bordered')}
            clickable={b(v, 'clickable')}
            onClick={b(v, 'clickable') ? () => {} : undefined}
          >
            <div style={{ fontSize: 'var(--text-title)', fontWeight: 700 }}>씨네큐브 광화문</div>
            <div style={{ marginTop: 4, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
              오늘 6회 상영 · 서울 종로구
            </div>
          </Card>
        </div>
      ),
    },
    specVisuals: [
      <div key="e" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
        <div style={{ width: 72, height: 48, borderRadius: 12, background: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }} />
        <div style={{ width: 72, height: 48, borderRadius: 12, background: 'var(--color-surface-card)', boxShadow: 'var(--shadow-md)' }} />
        <div style={{ width: 72, height: 48, borderRadius: 12, background: 'var(--color-surface-card)', boxShadow: 'var(--shadow-lg)' }} />
      </div>,
      <div key="r" style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
        {[12, 16, 20].map(r => (
          <div key={r} style={{
            width: 64, height: 44, borderRadius: r, background: 'var(--color-primary-100)',
            border: '1px solid var(--color-primary-300)',
          }} />
        ))}
      </div>,
      <div key="c">
        <Card clickable onClick={() => {}}>
          <span style={{ whiteSpace: 'nowrap' }}>눌러 보세요 · hover와 press 상태</span>
        </Card>
      </div>,
    ],
    usageVisuals: [
      <div key="do" style={{ display: 'grid', gap: 16, width: 220 }}>
        <Card>씨네큐브 광화문</Card><Card>아트나인</Card>
      </div>,
      <div key="dont" style={{ width: 220 }}>
        <Card padding="lg"><Card>중첩된 카드</Card></Card>
      </div>,
    ],
  },

  Input: {
    hero: <InputDemo />,
    usageVisuals: [
      <div key="do" style={{ width: 240 }}><Input label="이메일" defaultValue="a@b" error="이메일 형식이 아닙니다" /></div>,
      <div key="dont" style={{ width: 240 }}><Input placeholder="이메일" /></div>,
    ],
  },

  SortToggle: {
    playground: {
      controls: [
        { kind: 'toggle', name: 'active', label: 'Active', initial: true },
        { kind: 'text', name: 'label', label: '레이블', initial: '최신순 ↓' },
      ],
      render: v => <SortToggle active={b(v, 'active')}>{s(v, 'label')}</SortToggle>,
    },
    usageVisuals: [
      <SortToggle key="do" active>최신순 ↓</SortToggle>,
      <SortToggle key="dont" active>↓</SortToggle>,
    ],
  },

  Avatar: {
    playground: {
      controls: [
        { kind: 'radio', name: 'size', label: 'Size', options: ['24', '28', '44', '64'], initial: '44' },
        { kind: 'text', name: 'name', label: '이름', initial: '봉준호' },
      ],
      render: v => <Avatar name={s(v, 'name')} size={Number(s(v, 'size'))} />,
    },
    specVisuals: [
      <div key="i" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
        <Avatar name="봉준호" size={24} />
        <Avatar name="봉준호" size={44} />
        <Avatar name="봉준호" size={64} />
      </div>,
    ],
  },

  SectionHeader: {
    hero: (
      <div style={{ width: '100%', maxWidth: 420 }}>
        <SectionHeader title="오늘 상영하는 특별전" emoji="🎞" description="전국 독립·예술영화관 기준" trailing={<SortToggle active>최신순 ↓</SortToggle>} />
      </div>
    ),
    usageVisuals: [
      <div key="do" style={{ width: 260 }}><SectionHeader title="이번 주 GV" description="감독과의 대화가 열리는 상영" /></div>,
      <div key="dont" style={{ width: 260 }}>
        <SectionHeader title="이번 주 GV" description="감독과의 대화가 열리는 상영이 있는 극장과 시간표를 모아 안내합니다. 예매는 각 극장에서" />
      </div>,
    ],
  },

  Toast: {
    hero: <ToastDemo />,
    usageVisuals: [
      <div key="dont" style={{
        padding: '10px 16px', borderRadius: 'var(--radius-popover)',
        background: 'var(--color-neutral-800)', color: 'var(--color-text-inverse)',
        fontSize: 'var(--text-meta)', display: 'flex', gap: 12, alignItems: 'center',
      }}>
        담았어요 <span style={{ textDecoration: 'underline' }}>실행 취소</span>
      </div>,
    ],
  },

  BottomSheet: {
    hero: (
      <div style={{ width: 320 }}>
        <BottomSheet>
          <div style={{ padding: 'var(--gutter)' }}>
            <div style={{ fontSize: 'var(--text-title)', fontWeight: 700 }}>씨네큐브 광화문</div>
            <div style={{ marginTop: 4, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
              오늘 6회 상영
            </div>
          </div>
        </BottomSheet>
      </div>
    ),
    specVisuals: [
      <div key="s" style={{
        width: 200, height: 80, borderRadius: '20px 20px 0 0',
        background: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sheet)',
      }} />,
    ],
  },

  FabRound: { hero: <FabRound><IcoPlus /></FabRound> },

}

/** 상세 페이지 본문 — Anatomy · State · Spec · Usage. 코드잇 구성 그대로. */
export function ComponentDoc({ name }: { name: string }) {
  const guide = GUIDES[name]
  const doc = DOCS[name]

  // 전용 히어로 → 데모 갤러리 → 목록 썸네일 순으로 보여 준다.
  const hasStage = Boolean(doc?.hero || hasDemo(name) || hasThumb(name))

  return (
    <>
      {/* 무대도 파트 설명도 없으면 Anatomy 자체를 그리지 않는다 — 제목만 남은 섹션은 정보가 아니다. */}
      {(hasStage || guide?.anatomy) && (
        <DocSection id="anatomy" title="Anatomy" lead={guide?.anatomy ? '번호는 아래 파트 설명과 짝을 이룹니다. 필수(ESSENTIAL)와 선택(OPTIONAL)을 구분해 표기합니다.' : undefined}>
          {hasStage && (
            <Stage tone="tint" minHeight={260}>
              {doc?.hero ?? (hasDemo(name) ? <Demo name={name} /> : <ComponentThumb name={name} />)}
            </Stage>
          )}
          {guide?.anatomy && (
            <div style={{ marginTop: 'var(--spacing-6)' }}>
              <Anatomy parts={guide.anatomy} />
            </div>
          )}
        </DocSection>
      )}

      {doc?.playground && (
        <DocSection id="state" title="State" lead="컨트롤을 바꾸면 실제 컴포넌트가 반응합니다. 오른쪽 컨트롤 패널을 이용하세요.">
          <Playground {...doc.playground} />
        </DocSection>
      )}

      {guide?.specs?.length ? (
        <DocSection id="spec" title="Spec">
          {guide.specs.map((spec, i) => (
            <SpecRow
              key={spec.title}
              title={spec.title}
              desc={spec.desc}
              visual={doc?.specVisuals?.[i]}
            />
          ))}
        </DocSection>
      ) : null}

      {guide?.usage?.length ? (
        <DocSection id="usage" title="Usage">
          <UsageCards
            items={guide.usage.map((u, i) => ({
              kind: u.kind,
              rule: u.rule,
              visual: doc?.usageVisuals?.[i],
            }))}
          />
        </DocSection>
      ) : null}
    </>
  )
}
