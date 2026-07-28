/**
 * 리디자인 시안(Proposals) — /dev/components 갤러리 전용 (감사 제외 대상)
 *
 * 각 항목: [현행 | 시안] 나란히 비교.
 * - 현행: 실제 프리미티브 import
 * - 시안: 이 파일 안의 정적 구현 (프로덕션 컴포넌트 수정 없음)
 *
 * 색은 전부 기존 시맨틱 토큰(--color-info/success/warning/error/gv) + color-mix 틴트로
 * 지어서, 팔레트 교체 시 토큰만 갈아끼우면 시안도 함께 따라온다.
 */
'use client'

import React, { useState } from 'react'
import { Button, Badge, SearchBar, SearchBarButton } from '@/components/primitives'
import { Section, Label, captionStyle } from './gallery-shared'
import { ToastStatic } from './inline-patterns'

/* ── 틴트 헬퍼 — 시맨틱 토큰 기반 color-mix ─────────────────────── */
type Tone = 'info' | 'success' | 'warning' | 'error' | 'gv'
const toneVar = (t: Tone) => `var(--color-${t})`
/** 옅은 배경 틴트 — 표면색에 시맨틱 색을 섞어 라이트/다크 모두 적응 */
const tint = (t: Tone, pct = 12) =>
  `color-mix(in srgb, ${toneVar(t)} ${pct}%, var(--color-surface-card))`
/** 같은 계열 진한 텍스트 — 시맨틱 색을 텍스트 쪽으로 눌러줌 */
const deepText = (t: Tone) =>
  `color-mix(in srgb, ${toneVar(t)} 72%, var(--color-text-primary))`

/* ── 아이콘 (시안 전용 소형 세트) ───────────────────────────────── */
const Ico = {
  info: (size = 16, color = 'currentColor') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
  ),
  success: (size = 16, color = 'currentColor') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8.5 12.2 2.4 2.4 4.6-4.8" /></svg>
  ),
  warning: (size = 16, color = 'currentColor') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 21.5 20h-19z" /><path d="M12 10v4M12 17h.01" /></svg>
  ),
  error: (size = 16, color = 'currentColor') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></svg>
  ),
  close: (size = 14, color = 'currentColor') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
  ),
  search: (size = 16, color = 'currentColor') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  copy: (size = 14, color = 'currentColor') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></svg>
  ),
  star: (size = 14, color = 'currentColor') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" /></svg>
  ),
}

/* ── 비교 블록 래퍼 ─────────────────────────────────────────────── */
function Compare({
  id, name, refName, refUrl, note, current, proposal,
}: {
  id: string
  name: string
  /** 레퍼런스 출처 표기 (예: Atlassian Section Message) */
  refName: string
  refUrl: string
  note?: string
  current: React.ReactNode
  proposal: React.ReactNode
}) {
  const paneStyle: React.CSSProperties = {
    border: '1px dashed var(--color-border)',
    borderRadius: 8,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 0,
  }
  return (
    <div id={id} className="flex flex-col gap-3" style={{ scrollMarginTop: 16 }}>
      <div className="flex flex-col gap-[2px]">
        <p className="text-[14px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
        <p style={{ ...captionStyle, textTransform: 'none' }}>
          레퍼런스: {refName} —{' '}
          <a href={refUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>{refUrl}</a>
        </p>
        {note && (
          <p style={{ ...captionStyle, textTransform: 'none' }}>{note}</p>
        )}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div style={paneStyle}>
          <Label>현행</Label>
          {current}
        </div>
        <div style={paneStyle}>
          <Label>시안</Label>
          {proposal}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   1. SectionMessage 시안 — Atlassian Section Message 문법
   옅은 시맨틱 틴트 배경 + 좌측 컬러 아이콘 + 굵은 제목 + 본문 + 텍스트 링크 액션
   라운딩 --radius-badge(4px) · 그림자 없음 · 풀폭 블록
   ════════════════════════════════════════════════════════════════ */
const SM_ICON: Record<Tone, (s?: number, c?: string) => React.ReactNode> = {
  info: Ico.info, success: Ico.success, warning: Ico.warning, error: Ico.error, gv: Ico.info,
}

function SectionMessageProposal({
  tone, title, children, actions,
}: {
  tone: Exclude<Tone, 'gv'>
  title: string
  children: React.ReactNode
  actions?: { label: string }[]
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      width: '100%',
      padding: '12px 16px',
      backgroundColor: tint(tone, 12),
      borderRadius: 'var(--radius-badge)',
      boxShadow: 'none',
    }}>
      <span style={{ color: toneVar(tone), flexShrink: 0, marginTop: 1 }}>
        {SM_ICON[tone](18)}
      </span>
      <div className="flex flex-col gap-1" style={{ minWidth: 0 }}>
        <p style={{ fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.35 }}>
          {title}
        </p>
        <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
          {children}
        </p>
        {actions && actions.length > 0 && (
          <div className="flex gap-3 mt-1">
            {actions.map((a) => (
              <button key={a.label} type="button" style={{
                fontSize: 'var(--text-meta)',
                fontWeight: 600,
                color: deepText(tone),
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   2. ActionButton 시안 — Adobe Spectrum Action Button 문법
   중립 회색조 + 1px 보더 + 4px 라운딩 · quiet(고스트) · selected(진한 반전)
   ════════════════════════════════════════════════════════════════ */
function ActionButtonProposal({
  children, icon, quiet = false, selected = false, disabled = false, accent = false,
  'aria-label': ariaLabel,
}: {
  children?: React.ReactNode
  icon?: React.ReactNode
  quiet?: boolean
  selected?: boolean
  disabled?: boolean
  /** 강조(CTA)만 accent — 액션 버튼 기본은 무채색 */
  accent?: boolean
  'aria-label'?: string
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 32,
    ...(children ? { padding: '0 12px' } : { width: 32, padding: 0, justifyContent: 'center' }),   /* 아이콘 전용 = 정사각 (사용자 결정) */
    borderRadius: 'var(--radius-badge)',           /* 4px — 각진 편 */
    fontSize: 'var(--text-meta)',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
  }
  let look: React.CSSProperties
  if (selected) {
    look = {
      backgroundColor: 'var(--color-text-primary)',
      color: 'var(--color-surface-card)',
      border: '1px solid var(--color-text-primary)',
    }
  } else if (accent) {
    look = {
      backgroundColor: 'var(--color-primary-base)',
      color: 'var(--color-on-accent)',
      border: '1px solid var(--color-primary-base)',
    }
  } else if (quiet) {
    look = {
      backgroundColor: 'transparent',
      color: 'var(--color-text-body)',
      border: '1px solid transparent',
    }
  } else {
    look = {
      backgroundColor: 'var(--color-surface-card)',
      color: 'var(--color-text-body)',
      border: '1px solid var(--color-border)',
    }
  }
  return (
    <button type="button" disabled={disabled} aria-label={ariaLabel} style={{ ...base, ...look }}>
      {icon}
      {children}
    </button>
  )
}

/* ════════════════════════════════════════════════════════════════
   3. Toast 시안 — NS(네덜란드 철도) message/toast 문법
   시맨틱 컬러 배경 + 흰 텍스트/아이콘 + 좌측 아이콘 + 닫기 · 라운딩 작게
   ════════════════════════════════════════════════════════════════ */
function ToastProposal({ tone, message }: { tone: Exclude<Tone, 'gv'>; message: string }) {
  return (
    <div role="status" style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px 10px 14px',
      backgroundColor: toneVar(tone),
      color: 'var(--color-on-accent)',
      borderRadius: 'var(--radius-badge)',
      fontSize: 'var(--text-body)',
      fontWeight: 600,
      boxShadow: 'var(--shadow-md)',
      maxWidth: '100%',
    }}>
      <span style={{ flexShrink: 0, display: 'inline-flex' }}>{SM_ICON[tone](16)}</span>
      <span style={{ minWidth: 0 }}>{message}</span>
      <button type="button" aria-label="닫기" style={{
        display: 'inline-flex',
        background: 'none',
        border: 'none',
        color: 'var(--color-on-accent)',
        opacity: 0.85,
        cursor: 'pointer',
        padding: 4,
        marginLeft: 2,
        flexShrink: 0,
      }}>
        {Ico.close()}
      </button>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   4. Tag 시안 — Carbon Tag 색상 체계
   옅은 컬러 틴트 배경 + 같은 계열 진한 텍스트 · --radius-badge(4px, pill 아님)
   ════════════════════════════════════════════════════════════════ */
function TagProposal({ tone, children }: { tone: Tone | 'gray'; children: React.ReactNode }) {
  const isGray = tone === 'gray'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 8px',
      borderRadius: 'var(--radius-badge)',
      fontSize: 'var(--text-caption)',
      fontWeight: 600,
      backgroundColor: isGray ? 'var(--color-surface-raised)' : tint(tone, 14),
      color: isGray ? 'var(--color-text-sub)' : deepText(tone),
    }}>
      {children}
    </span>
  )
}

/* ════════════════════════════════════════════════════════════════
   5. 검색 B안 — 페이지 내 각진 인풋 (상영작 탭)
   --radius-control · 1px 보더 · 좌측 돋보기
   ════════════════════════════════════════════════════════════════ */
function SearchInputProposal({ value, placeholder }: { value?: string; placeholder?: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 'var(--comp-search-height)',
      padding: '0 14px',
      backgroundColor: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-control)',   /* 12px — pill 아님 */
      maxWidth: 400,
    }}>
      <span style={{ color: 'var(--color-text-caption)', flexShrink: 0, display: 'inline-flex' }}>
        {Ico.search()}
      </span>
      {value ? (
        <span style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-primary)', flex: 1 }}>{value}</span>
      ) : (
        <span style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-placeholder)', flex: 1 }}>{placeholder}</span>
      )}
      {value && (
        <button type="button" aria-label="지우기" style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          borderRadius: 'var(--radius-badge)',
          color: 'var(--color-text-caption)',
          cursor: 'pointer',
          width: 24,
          height: 24,
          padding: 0,
          flexShrink: 0,
        }}>
          {Ico.close(12)}
        </button>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   섹션 조립
   ════════════════════════════════════════════════════════════════ */
export function ProposalsSection() {
  const [searchValue, setSearchValue] = useState('')

  return (
    <Section id="sec-proposals" title="리디자인 시안 — 현행 vs 레퍼런스 재현">
      <p style={{ ...captionStyle, textTransform: 'none' }}>
        지정 레퍼런스의 문법을 현 토큰 체계 위에 재현한 갤러리 전용 정적 시안.
        색은 --color-info/success/warning/error/gv + color-mix 틴트만 사용 — 팔레트 교체 시 토큰만 바꾸면 함께 따라옴.
        프로덕션 컴포넌트는 수정하지 않음.
      </p>

      {/* 1. Alert → Section Message */}
      <Compare
        id="prop-sectionmessage"
        name="Alert → SectionMessage — 옅은 틴트 블록"
        refName="Atlassian Design System · Section message"
        refUrl="https://atlassian.design/components/section-message/"
        note="현행에는 Alert 프리미티브가 없음 — 인라인 에러 텍스트·Toast·Badge로 분산 처리 중"
        current={
          <div className="flex flex-col gap-3">
            <ToastStatic message="복사되었습니다" />
            <div className="flex gap-2">
              <Badge variant="error">error</Badge>
              <Badge variant="info">info</Badge>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-error)' }}>
              이메일 형식이 올바르지 않습니다 (Input 인라인 에러)
            </p>
          </div>
        }
        proposal={
          <div className="flex flex-col gap-3">
            <SectionMessageProposal tone="info" title="상영시간표 안내"
              actions={[{ label: '자세히 보기' }]}>
              이 극장의 시간표는 매일 오전 6시에 갱신됩니다.
            </SectionMessageProposal>
            <SectionMessageProposal tone="success" title="저장 완료"
              actions={[{ label: '즐겨찾기 목록' }]}>
              더숲 아트시네마가 즐겨찾기에 추가되었습니다.
            </SectionMessageProposal>
            <SectionMessageProposal tone="warning" title="좌석 정보 지연"
              actions={[{ label: '새로고침' }, { label: '무시' }]}>
              좌석 잔여 수가 최대 10분 전 정보일 수 있습니다.
            </SectionMessageProposal>
            <SectionMessageProposal tone="error" title="시간표를 불러오지 못했습니다"
              actions={[{ label: '다시 시도' }]}>
              네트워크 상태를 확인한 뒤 다시 시도해 주세요.
            </SectionMessageProposal>
          </div>
        }
      />

      {/* 2. Button → Action Button */}
      <Compare
        id="prop-actionbutton"
        name="Button → ActionButton — 무채색 + 4px 라운딩"
        refName="Adobe Spectrum · Action button"
        refUrl="https://spectrum.adobe.com/page/action-button/"
        note="액션 버튼은 무채색이 기본 — 강조(CTA)에만 accent. quiet은 보더 없는 고스트, selected는 진한 배경 반전"
        current={
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm">primary</Button>
              <Button size="sm" variant="secondary">secondary</Button>
              <Button size="sm" variant="ghost">ghost</Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="danger">danger</Button>
              <Button size="sm" disabled>disabled</Button>
            </div>
          </div>
        }
        proposal={
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap items-center">
              <ActionButtonProposal icon={Ico.copy()}>기본</ActionButtonProposal>
              <ActionButtonProposal quiet icon={Ico.star()}>quiet</ActionButtonProposal>
              <ActionButtonProposal selected icon={Ico.star()}>selected</ActionButtonProposal>
              <ActionButtonProposal disabled icon={Ico.copy()}>disabled</ActionButtonProposal>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <ActionButtonProposal icon={Ico.copy()} aria-label="아이콘만" />
              <ActionButtonProposal>라벨만</ActionButtonProposal>
              <ActionButtonProposal accent>CTA만 accent</ActionButtonProposal>
            </div>
          </div>
        }
      />

      {/* 3. Toast → NS message/toast */}
      <Compare
        id="prop-toast"
        name="Toast — 시맨틱 컬러 배경"
        refName="NS Design System (Nederlandse Spoorwegen) · Message/Toast"
        refUrl="https://www.ns.nl/"
        note="검은 알약 대신 시맨틱 컬러 배경 + 흰 텍스트/아이콘 + 닫기 — 라운딩 작게"
        current={
          <div className="flex flex-col gap-2 items-start">
            <ToastStatic message="복사되었습니다" />
            <p style={{ ...captionStyle, textTransform: 'none' }}>단일 스타일 (neutral-900 알약)</p>
          </div>
        }
        proposal={
          <div className="flex flex-col gap-2 items-start">
            <ToastProposal tone="info" message="상영시간표가 갱신되었습니다" />
            <ToastProposal tone="success" message="즐겨찾기에 추가되었습니다" />
            <ToastProposal tone="warning" message="좌석 정보가 지연되고 있습니다" />
            <ToastProposal tone="error" message="주소 복사에 실패했습니다" />
          </div>
        }
      />

      {/* 4. Badge → Carbon Tag */}
      <Compare
        id="prop-tag"
        name="Badge → Tag — 컬러 틴트 + 소형 라운딩"
        refName="IBM Carbon Design System · Tag"
        refUrl="https://carbondesignsystem.com/components/tag/usage/"
        note="Carbon의 톤별 틴트+진한 글자 색 체계 채용, 형태는 --radius-badge(4px)로 인쇄물 결 유지 (pill 아님)"
        current={
          <div className="flex gap-2 flex-wrap">
            <Badge>default</Badge>
            <Badge variant="success">success</Badge>
            <Badge variant="warning">warning</Badge>
            <Badge variant="error">error</Badge>
            <Badge variant="info">info</Badge>
          </div>
        }
        proposal={
          <div className="flex gap-2 flex-wrap">
            <TagProposal tone="gray">gray</TagProposal>
            <TagProposal tone="info">info</TagProposal>
            <TagProposal tone="success">success</TagProposal>
            <TagProposal tone="warning">warning</TagProposal>
            <TagProposal tone="error">error</TagProposal>
            <TagProposal tone="gv">gv</TagProposal>
          </div>
        }
      />

      {/* 5. 검색 — 직사각형 단일안 */}
      <Compare
        id="prop-search"
        name="검색 — 직사각형 단일안 (지도 상단 포함 전 검색)"
        refName="각진 input (--radius-control · 1px 보더 · 좌측 돋보기)"
        refUrl="https://carbondesignsystem.com/components/search/usage/"
        note="지도 위 플로팅 검색은 실제로 없음 — 지도 상단 검색바 포함 모든 검색을 각진 형태로 통일하는 시안"
        current={
          <div className="flex flex-col gap-3" style={{ maxWidth: 400 }}>
            <Label>지도 상단 (버튼 모드 · pill)</Label>
            <SearchBarButton placeholder="극장 또는 영화 검색" onClick={() => {}} />
            <Label>상영작 탭 (인풋 모드 · pill)</Label>
            <SearchBar
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onClear={() => setSearchValue('')}
              onBack={() => {}}
            />
          </div>
        }
        proposal={
          <div className="flex flex-col gap-3" style={{ maxWidth: 400 }}>
            <Label>기본 (radius-control · 보더 · 좌측 돋보기)</Label>
            <SearchInputProposal placeholder="극장 또는 영화 검색" />
            <Label>값 입력됨 (clear)</Label>
            <SearchInputProposal value="봉준호" />
            <Label>지도 상단 배치 맥락 (배경 근사)</Label>
            <div style={{ padding: '14px 12px 40px', borderRadius: 8, backgroundColor: '#d4d0c8' }}>
              <div style={{ boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-control)' }}>
                <SearchInputProposal placeholder="극장 또는 영화 검색" />
              </div>
            </div>
          </div>
        }
      />
    </Section>
  )
}
