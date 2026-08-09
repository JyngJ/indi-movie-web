/**
 * 모션 프리미티브 쇼케이스 — /dev/components (감사 제외 대상)
 * 원본: src/components/motion/*
 */
'use client'

import { useState } from 'react'
import {
  AnimatedGroup, type AnimatedGroupPreset,
  Dialog, DialogTrigger, DialogContainer, DialogContent,
  DialogTitle, DialogSubtitle, DialogDescription, DialogClose,
  Carousel, CarouselContent, CarouselItem, CarouselNavigation, CarouselIndicator,
  TransitionPanel, slideVariants,
} from '@/components/motion'
import { Button } from '@/components/primitives'
import { PosterThumb } from '@/components/domain'
import { Section, Entry, captionStyle } from './gallery-shared'

const PRESETS: AnimatedGroupPreset[] = ['fade', 'slide', 'scale', 'blur', 'blur-slide']

/* 실제 포스터 URL 없이도 감을 볼 수 있게 색 블록으로 대체 */
function Tile({ n }: { n: number }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        aspectRatio: '2 / 3',
        borderRadius: 'var(--radius-poster)',
        backgroundColor: 'var(--color-surface-raised)',
        color: 'var(--color-text-caption)',
        fontSize: 'var(--text-body)',
      }}
    >
      {n}
    </div>
  )
}

function AnimatedGroupDemo() {
  const [preset, setPreset] = useState<AnimatedGroupPreset>('scale')
  /* key를 바꿔 리마운트 → 같은 프리셋도 다시 재생 */
  const [runId, setRunId] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => { setPreset(p); setRunId((r) => r + 1) }}
            className="px-3 py-1 text-[12px] border"
            style={{
              borderRadius: 'var(--radius-pill)',
              borderColor: 'var(--color-border)',
              backgroundColor: p === preset ? 'var(--color-primary-base)' : 'var(--color-surface-card)',
              color: p === preset ? 'var(--color-on-accent)' : 'var(--color-text-body)',
            }}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setRunId((r) => r + 1)}
          className="px-3 py-1 text-[12px] border"
          style={{
            borderRadius: 'var(--radius-pill)',
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface-card)',
            color: 'var(--color-text-body)',
          }}
        >
          다시 재생
        </button>
      </div>

      <AnimatedGroup
        key={runId}
        preset={preset}
        className="grid grid-cols-4 gap-3"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <Tile key={i} n={i + 1} />
        ))}
      </AnimatedGroup>
    </div>
  )
}

function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger
        className="flex items-center gap-3 border p-3"
        style={{
          width: 260,
          borderRadius: 'var(--radius-control)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface-card)',
        }}
      >
        <PosterThumb width={48} height={72} />
        <div className="flex flex-col">
          <DialogTitle style={{ fontSize: 'var(--text-body)', fontWeight: 700 }}>
            기억의 빛
          </DialogTitle>
          <DialogSubtitle style={{ fontSize: 'var(--text-caption)' }}>
            봉준호 · 2003
          </DialogSubtitle>
        </div>
      </DialogTrigger>

      <DialogContainer>
        <DialogContent className="relative p-6" style={{ width: 'min(420px, 92vw)' }}>
          <DialogTitle style={{ fontSize: 'var(--text-h2)', fontWeight: 700 }}>
            기억의 빛
          </DialogTitle>
          <DialogSubtitle style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
            봉준호 · 2003 · 드라마
          </DialogSubtitle>
          <DialogDescription style={{ fontSize: 'var(--text-body)', marginTop: 16 }}>
            늦은 밤 노원의 골목, 영사기는 천천히 돌아간다. 오래된 극장에서 상영되는 낡은 필름 속에서
            한 남자는 잊고 있던 기억과 마주하게 되는데…
          </DialogDescription>
          <DialogClose />
        </DialogContent>
      </DialogContainer>
    </Dialog>
  )
}

function CarouselDemo() {
  return (
    <div className="relative w-full">
      <Carousel>
        <CarouselContent className="-ml-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <CarouselItem key={i} className="basis-1/4 pl-3">
              <Tile n={i + 1} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNavigation className="absolute -top-10 right-0 justify-end" alwaysShow />
        <CarouselIndicator className="mt-3" />
      </Carousel>
    </div>
  )
}

const PANEL_PAGES = [
  { title: '지금 어디서 볼 수 있는지', body: '전국 독립·예술영화관 상영표를 한 곳에서 봅니다.' },
  { title: '취향으로 골라주기', body: '곧 내려가는 영화, 오랜만에 돌아온 영화를 먼저 알려드려요.' },
  { title: '영화를 고르면 극장이', body: '핀의 포스터 = 지금 그 극장에서 상영 중인 영화.' },
  { title: '어디에 계신지', body: '가까운 극장부터, 지금 출발하면 볼 수 있는 상영부터.' },
]

function TransitionPanelDemo() {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  const go = (next: number) => {
    setDirection(next > index ? 1 : -1)
    setIndex(Math.max(0, Math.min(PANEL_PAGES.length - 1, next)))
  }

  return (
    <div
      className="border"
      style={{
        width: 360,
        borderRadius: 'var(--radius-control)',
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface-card)',
      }}
    >
      <TransitionPanel
        activeIndex={index}
        direction={direction}
        variants={slideVariants(360)}
        style={{ height: 120 }}
      >
        {PANEL_PAGES.map((p) => (
          <div key={p.title} className="flex flex-col gap-2 p-4">
            <p style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {p.title}
            </p>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-caption)' }}>{p.body}</p>
          </div>
        ))}
      </TransitionPanel>
      <div className="flex justify-between p-4">
        <Button variant="secondary" size="sm" onClick={() => go(index - 1)} disabled={index === 0}>
          이전
        </Button>
        <Button size="sm" onClick={() => go(index + 1)} disabled={index === PANEL_PAGES.length - 1}>
          다음
        </Button>
      </div>
    </div>
  )
}

export function MotionSection() {
  return (
    <Section id="sec-motion" title="모션 — 등장 · 모핑 · 캐러셀">
      <Entry
        id="motion-animatedgroup"
        name="AnimatedGroup — 순차 등장 (5 preset)"
        screens="포스터 그리드 · 큐레이션 섹션 행"
        source="src/components/motion/AnimatedGroup.tsx"
      >
        <AnimatedGroupDemo />
        <p style={{ ...captionStyle, textTransform: 'none' }}>
          stagger 0.05s. inView 프롭을 주면 스크롤로 뷰포트 진입 시 1회 재생.
        </p>
      </Entry>

      <Entry
        id="motion-dialog"
        name="Dialog — 트리거 카드가 그대로 커지는 모핑"
        screens="영화 카드 → 상세 미리보기 (적용 예정)"
        source="src/components/motion/Dialog.tsx"
      >
        <DialogDemo />
        <p style={{ ...captionStyle, textTransform: 'none' }}>
          트리거와 콘텐츠가 layoutId를 공유. ESC · 배경 클릭 닫기, 배경 스크롤 잠금 포함.
        </p>
      </Entry>

      <Entry
        id="motion-transitionpanel"
        name="TransitionPanel — 단계 전환 (방향 인식)"
        screens="온보딩 데스크톱 모달"
        source="src/components/motion/TransitionPanel.tsx"
      >
        <TransitionPanelDemo />
        <p style={{ ...captionStyle, textTransform: 'none' }}>
          다음/이전에 따라 들어오는 방향이 뒤집힌다. 온보딩 모바일은 기존 scroll-snap 스와이프 유지.
        </p>
      </Entry>

      <Entry
        id="motion-carousel"
        name="Carousel — 드래그 · 스냅 · 인디케이터"
        screens="큐레이션 섹션 행 (적용 예정)"
        source="src/components/motion/Carousel.tsx (embla-carousel-react)"
      >
        <CarouselDemo />
      </Entry>
    </Section>
  )
}
