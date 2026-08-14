'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { Button, Chip, IconButton, Input } from '@/components/primitives'
import { TransitionPanel, slideVariants } from '@/components/motion'
// 분류 목록은 API 화이트리스트(lib/reports/types)가 단일 소스 — UI 로컬 상수와 어긋나면
// '기타' 외 전부 400으로 거부된다(실제로 발생했던 불일치).
import { REPORT_CATEGORIES } from '@/lib/reports/types'

export type SettingsPage = 'main' | 'report' | 'attribution' | 'about'
type Page = SettingsPage

/* TransitionPanel 자식 순서와 일치해야 한다 */
const PAGE_INDEX: Record<Page, number> = { main: 0, report: 1, attribution: 2, about: 3 }

/* ── 아이콘 ── */
const IcoChevronRight = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)
const IcoChevronLeft = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const IcoClose = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IcoCamera = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const IcoSend = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const IcoExternalLink = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)
const IcoLinkedIn = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
)

const IcoGitHub = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
)

/* ── 공통 헤더 ── */
export function SettingsHeader({ title, onBack, onClose, submitting }: { title: string; onBack?: () => void; onClose?: () => void; submitting?: boolean }) {
  return (
    <div style={{
      height: 52,
      paddingTop: 'max(0px, env(safe-area-inset-top))',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'center', paddingLeft: onBack ? 8 : 16, paddingRight: 8,
      gap: 4, flexShrink: 0, backgroundColor: 'var(--color-surface-card)',
    }}>
      {onBack && (
        <IconButton variant="ghost" size={44} aria-label="뒤로가기" onClick={onBack} disabled={submitting}><IcoChevronLeft /></IconButton>
      )}
      <span className="display-h2" style={{ flex: 1, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      {onClose && (
        <IconButton variant="ghost" size={44} aria-label="닫기" onClick={onClose} disabled={submitting}><IcoClose /></IconButton>
      )}
    </div>
  )
}

/* 푸터 링크 — button·a·구분점을 같은 높이/정렬로 통일 */
const footerLink: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 8px',
  background: 'none', border: 'none', cursor: 'pointer', minHeight: 'unset',
  fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)',
  fontFamily: 'var(--font-sans)', fontWeight: 500, borderRadius: 'var(--radius-button)',
}
const footerDot: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', height: 30,
  fontSize: 'var(--text-meta)', color: 'var(--color-text-placeholder)',
}

/* ── 설정 메인 ── */
export function SettingsMainPage({
  onNavigate,
  onExternalNav,
}: {
  onNavigate: (page: Page) => void
  /** FAQ처럼 별도 라우트로 나가는 링크 클릭 시 — 모달 컨텍스트에서는 패널을 닫는다 */
  onExternalNav?: () => void
}) {
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px',
    backgroundColor: 'var(--color-surface-card)',
    border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', minHeight: 'unset',
    borderBottom: '1px solid var(--color-border)',
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-surface-bg)', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
      {/* 카드 2: 자주 묻는 질문 · 버그 리포트 */}
      <div style={{ margin: '12px 16px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <Link href="/faq" style={{ ...row, textDecoration: 'none' }} onClick={onExternalNav}>
          <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-sub)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>자주 묻는 질문</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 4 }}>서비스 소개와 이용 안내</div>
          </div>
          <span style={{ color: 'var(--color-text-placeholder)' }}><IcoChevronRight /></span>
        </Link>
        <button style={{ ...row, borderBottom: 'none' }} onClick={() => onNavigate('report')}>
          <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-sub)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>버그 리포트</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 4 }}>오류·깨짐을 알려주세요</div>
          </div>
          <span style={{ color: 'var(--color-text-placeholder)' }}><IcoChevronRight /></span>
        </button>
      </div>

      {/* 안내 배너 */}
      <div style={{ margin: '12px 16px 0', backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface-bg))', border: '1px solid color-mix(in srgb, var(--color-warning) 25%, transparent)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth={1.75} strokeLinecap="round" style={{ flexShrink: 0, marginTop: 4 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p className="text-note" style={{ margin: 0, color: 'var(--color-text-sub)' }}>
          상영 정보는 실시간으로 불러오지 않으므로 실제 좌석 현황과 다를 수 있습니다.
        </p>
      </div>

      {/* 푸터 링크 */}
      <div style={{ margin: '24px 16px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Button variant="ghost" size="sm" style={{ color: 'var(--color-text-sub)', fontWeight: 500 }} onClick={() => onNavigate('attribution')}>출처 표기 정보</Button>
        <span style={footerDot}>·</span>
        {/* 만든 사람 탭 임시 숨김 */}
        <Link href="/privacy" className="hover-raise" style={{ ...footerLink, height: 32, textDecoration: 'none' }}>개인정보 처리방침</Link>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)' }}>
        영화볼지도 · v0.1.0
      </div>
    </div>
  )
}

/* ── 버그 리포트 전송 완료 ── */
export function ReportSuccessNotice() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, backgroundColor: 'var(--color-surface-bg)' }}>
      {/* 성공 체크 — 원이 팝인한 뒤 체크가 그려진다 */}
      <div
        className="success-check-circle"
        style={{
          width: 56, height: 56, borderRadius: '50%',
          backgroundColor: 'color-mix(in srgb, var(--color-success) 14%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path className="success-check-path" d="M5 13l5 5L20 7" />
        </svg>
      </div>
      <div style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text-primary)' }}>감사합니다!</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-sub)', textAlign: 'center', lineHeight: 1.6 }}>제보해 주셔서 감사합니다.<br/>확인 후 이메일로 답변 드리겠습니다.</div>
    </div>
  )
}

/* ── 버그 리포트 ── */
export function SettingsReportPage({
  selectedMovieId, selectedTheaterName, initialCategory, onSuccess,
}: {
  selectedMovieId?: string | null
  selectedTheaterName?: string
  /** FAQ 등 외부 진입 시 분류 프리셀렉트 — 화이트리스트에 없는 값은 무시 */
  initialCategory?: string
  onSuccess: () => void
}) {
  const [category, setCategory] = useState(
    initialCategory && (REPORT_CATEGORIES as readonly string[]).includes(initialCategory) ? initialCategory : ''
  )
  const [detail, setDetail] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSubmit = category.length > 0 && detail.trim().length > 0 && consent && !submitting

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.set('category', category)
      form.set('detail', detail)
      form.set('email', email)
      form.set('consent', String(consent))
      form.set('pageUrl', window.location.href)
      if (selectedMovieId) form.set('selectedMovieId', selectedMovieId)
      if (selectedTheaterName) form.set('selectedTheaterName', selectedTheaterName)
      files.forEach(f => form.append('files', f))
      const res = await fetch('/api/reports', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`서버 오류 ${res.status}`)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : '전송 실패')
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, category, consent, detail, email, files, selectedMovieId, selectedTheaterName, onSuccess])

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '12px', borderRadius: 'var(--radius-control)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-bg)',
    color: 'var(--color-text-primary)',
    fontSize: 14, resize: 'none', outline: 'none',
    fontFamily: 'var(--font-sans)',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px var(--gutter)', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 20, backgroundColor: 'var(--color-surface-bg)' }}>
      <p className="text-note" style={{ margin: 0, color: 'var(--color-text-sub)' }}>
        발견하신 오류를 알려주세요. 어떤 화면에서 무엇이 잘못됐는지 적어주시면 큰 도움이 됩니다.
      </p>

      {/* 분류 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 8 }}>분류</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REPORT_CATEGORIES.map(cat => (
            <Chip key={cat} selected={category === cat} onClick={() => setCategory(cat)}>{cat}</Chip>
          ))}
        </div>
      </div>

      {/* 내용 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 8 }}>내용</div>
        <textarea
          value={detail}
          onChange={e => setDetail(e.target.value)}
          maxLength={500}
          rows={5}
          placeholder="예) 라이카시네마 상영 시간표가 어제 날짜로 표시돼요."
          style={{ ...inputStyle, minHeight: 120 }}
        />
        {/* 첨부 버튼과 글자수 카운터를 한 줄로 — 세로 공간 확보로 전송 버튼이 화면 안에 들어온다 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files ?? []).slice(0, 3))} />
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <IcoCamera /> 스크린샷 첨부
          </Button>
          <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)', flexShrink: 0 }}>{detail.length}/500</span>
        </div>
        {files.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-caption)' }}>
            {files.map(f => f.name).join(', ')}
          </div>
        )}
      </div>

      {/* 이메일 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 8 }}>회신 이메일 (선택)</div>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>

      {/* 동의 */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 4, width: 16, height: 16, accentColor: 'var(--color-primary-base)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-sub)', lineHeight: 1.5 }}>
          제출하는 내용과 스크린샷이 서비스 개선 목적으로 사용될 수 있음에 동의합니다.
        </span>
      </label>

      {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--color-error)' }}>{error}</p>}

      {/* 전송 버튼 */}
      <Button fullWidth onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
        {!submitting && <IcoSend />} {submitting ? '전송 중…' : '리포트 보내기'}
      </Button>
    </div>
  )
}

/* ── 출처 표기 ── */
export function SettingsAttributionPage() {
  const card: React.CSSProperties = {
    margin: '12px 16px 0', borderRadius: 12, overflow: 'hidden',
    border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)',
  }
  const labelRow: React.CSSProperties = {
    padding: '8px 16px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.6px',
    color: 'var(--color-text-placeholder)', textTransform: 'uppercase',
  }
  const valueBox: React.CSSProperties = {
    margin: '8px 16px', padding: '8px 12px', borderRadius: 8,
    backgroundColor: 'var(--color-surface-bg)',
    fontSize: 12, color: 'var(--color-text-sub)', fontFamily: 'var(--font-mono)',
  }
  const linkRow: React.CSSProperties = {
    padding: '8px 16px 12px',
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 13, fontWeight: 500, color: 'var(--color-primary-base)', cursor: 'pointer',
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-surface-bg)', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
      {/* 지도 데이터 */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-sub)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 600 }}>지도 데이터</div>
            <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>OpenStreetMap</div>
          </div>
        </div>
        <div style={valueBox}>© OpenStreetMap contributors</div>
        <button onClick={() => window.open('https://www.openstreetmap.org/copyright', '_blank', 'noopener')} style={{ ...linkRow as React.CSSProperties, background: 'none', border: 'none' }}>
          www.openstreetmap.org/copyright <IcoExternalLink />
        </button>
      </div>

      {/* 서체 */}
      <div style={card}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-sub)' }}>T</div>
          <div>
            <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 600 }}>서체</div>
            <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>KIMM 서체</div>
          </div>
        </div>
        <div style={valueBox}>출처 – 한국기계연구원, kimm.re.kr</div>
        <button onClick={() => window.open('https://www.kimm.re.kr', '_blank', 'noopener')} style={{ ...linkRow as React.CSSProperties, background: 'none', border: 'none' }}>
          www.kimm.re.kr <IcoExternalLink />
        </button>
      </div>
    </div>
  )
}

/* ── 만든 사람 ── */
export function SettingsAboutPage() {
  const team = [
    { name: '정재용', role: 'Design · Frontend', linkedin: 'https://www.linkedin.com/in/jaeyongjung/', github: null },
    { name: '정재현', role: 'Database · Backend', linkedin: null, github: 'https://github.com/RGLie' },
  ]
  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-surface-bg)', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
      {/* 앱 로고 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
          <img src="/squarelogo.svg" alt="영화볼지도" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="display-h2" style={{ color: 'var(--color-text-primary)' }}>영화볼지도</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 4 }}>independent cinema map</div>
      </div>

      {/* 만든 사람 */}
      <div style={{ margin: '0 16px', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)' }}>
        <div style={{ padding: '8px 16px', fontSize: 'var(--text-badge)', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--color-text-placeholder)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>만든 사람</div>
        {team.map((member, i) => (
          <div key={member.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderBottom: i < team.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{member.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 4 }}>{member.role}</div>
            </div>
            {member.linkedin && (
              <IconButton size={32} aria-label={`${member.name} 링크드인`} onClick={() => window.open(member.linkedin!, '_blank', 'noopener')} style={{ backgroundColor: '#0A66C2', color: 'var(--color-on-accent)' }}>
                <IcoLinkedIn />
              </IconButton>
            )}
            {member.github && (
              <IconButton size={32} aria-label={`${member.name} 깃허브`} onClick={() => window.open(member.github!, '_blank', 'noopener')} style={{ backgroundColor: '#24292e', color: 'var(--color-on-accent)' }}>
                <IcoGitHub />
              </IconButton>
            )}
          </div>
        ))}
      </div>

      {/* 카피라이트 */}
      <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--color-text-placeholder)' }}>
        <div>© 2026 영화볼지도</div>
      </div>
    </div>
  )
}

/* ── 메인 SettingsPanel ── */
export function SettingsPanel({
  isOpen,
  onClose,
  isDesktopLayout,
  selectedMovieId,
  selectedTheaterName,
  initialPage = 'main',
}: {
  isOpen: boolean
  onClose: () => void
  isDesktopLayout: boolean
  selectedMovieId?: string | null
  selectedTheaterName?: string
  initialPage?: Page
}) {
  const [page, setPage] = useState<Page>('main')
  const [direction, setDirection] = useState(1)
  const [reportSuccess, setReportSuccess] = useState(false)

  // 열림/닫힘 전환 — 진입은 CSS 키프레임(마운트 시 항상 재생), 퇴장은
  // closing 상태로 transition을 걸고 끝난 뒤 언마운트한다.
  // 진입 애니메이션이 활성인 동안엔 그 속성들에 transition이 생성되지 않으므로,
  // 애니메이션이 끝나면(entered) 클래스를 떼서 퇴장 transition 경로를 비워 둔다.
  const [render, setRender] = useState(isOpen)
  const [closing, setClosing] = useState(false)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (isOpen) {
      setRender(true)
      setClosing(false)
      return
    }
    if (!render) return
    setClosing(true)
    const timer = setTimeout(() => { setRender(false); setClosing(false); setEntered(false) }, 220)
    return () => clearTimeout(timer)
  }, [isOpen, render])

  useLockBodyScroll(isOpen)

  // 열릴 때마다 요청된 첫 페이지로 진입 — 좌측 레일 '신고' 버튼은 바로 report로 들어옴
  useEffect(() => {
    if (isOpen) setPage(initialPage)
  }, [isOpen, initialPage])

  const handleClose = () => {
    onClose()
    // 닫힌 후 페이지 리셋
    setTimeout(() => { setPage('main'); setReportSuccess(false) }, 300)
  }

  const navigateTo = (p: Page) => { setDirection(1); setPage(p) }
  const handleBack = () => { setDirection(-1); setPage('main') }

  const pageTitle: Record<Page, string> = {
    main: '설정',
    report: '버그 리포트',
    attribution: '출처 표기',
    about: '만든 사람',
  }

  if (!render) return null

  const content = (
    <div
      onClick={e => e.stopPropagation()}
      /* 종료 후 클래스 제거는 값 변화가 없어(backwards fill) 안전하다 */
      className={entered ? undefined : isDesktopLayout ? 'modal-card-in' : 'modal-card-in-mobile'}
      onAnimationEnd={e => { if (e.animationName.startsWith('modal-card-in')) setEntered(true) }}
      style={{
        width: isDesktopLayout ? 400 : '100%',
        maxWidth: isDesktopLayout ? 'calc(100vw - 48px)' : undefined,
        height: isDesktopLayout ? 'min(680px, calc(100dvh - 48px))' : '100dvh',
        backgroundColor: 'var(--color-surface-bg)',
        color: 'var(--color-text-primary)',
        border: isDesktopLayout ? '1px solid var(--color-border)' : 'none',
        borderRadius: isDesktopLayout ? 20 : 0,
        boxShadow: 'var(--shadow-sheet)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: closing
          ? (isDesktopLayout ? 'scale(0.96) translateY(12px)' : 'translateY(24px)')
          : 'none',
        opacity: closing ? 0 : 1,
        transition: 'transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 180ms ease',
      }}
    >
      <SettingsHeader
        title={pageTitle[page]}
        onBack={page !== 'main' ? handleBack : undefined}
        onClose={handleClose}
        submitting={false}
      />

      {/* 페이지 전환 — 메인→하위는 오른쪽에서, 뒤로가기는 왼쪽에서 들어온다 */}
      <TransitionPanel
        className="settings-pages"
        activeIndex={PAGE_INDEX[page]}
        direction={direction}
        variants={slideVariants(isDesktopLayout ? 400 : 360)}
        style={{ flex: 1, minHeight: 0 }}
      >
        <SettingsMainPage onNavigate={navigateTo} onExternalNav={handleClose} />
        {reportSuccess ? (
          <ReportSuccessNotice />
        ) : (
          <SettingsReportPage
            selectedMovieId={selectedMovieId}
            selectedTheaterName={selectedTheaterName}
            onSuccess={() => setReportSuccess(true)}
          />
        )}
        <SettingsAttributionPage />
        <SettingsAboutPage />
      </TransitionPanel>
    </div>
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={entered ? undefined : 'modal-backdrop-in'}
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2100,  /* absolute면 스크롤된 컨테이너 기준으로 떠서 이탈 — 뷰포트 고정 */
        height: '100dvh',
        backgroundColor: closing ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.38)',
        transition: 'background-color 220ms ease',
        display: 'flex',
        alignItems: isDesktopLayout ? 'center' : 'stretch',
        justifyContent: isDesktopLayout ? 'center' : 'stretch',
        padding: isDesktopLayout ? 24 : 0,
      }}
    >
      {content}
    </div>
  )
}
