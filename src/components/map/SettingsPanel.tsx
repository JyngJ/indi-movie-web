'use client'

import { useState, useCallback, useRef } from 'react'
import { Sun, Moon, HeartHandshake } from 'lucide-react'
import Link from 'next/link'

export type SettingsPage = 'main' | 'report' | 'attribution' | 'about'
type Page = SettingsPage

const REPORT_CATEGORIES = ['지도 오류', '상영 정보 오류', '화면 깨짐', '기능 동작', '기타'] as const

/* ── 아이콘 ── */
const IcoChevronRight = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)
const IcoChevronLeft = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const IcoClose = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IcoCamera = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const IcoSend = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
  const btn: React.CSSProperties = {
    width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)',
    borderRadius: 8, flexShrink: 0, minHeight: 'unset',
  }
  return (
    <div style={{
      height: 52,
      paddingTop: 'max(0px, env(safe-area-inset-top))',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'center', paddingLeft: onBack ? 8 : 16, paddingRight: 8,
      gap: 4, flexShrink: 0, backgroundColor: 'var(--color-surface-card)',
    }}>
      {onBack && (
        <button style={btn} onClick={onBack} disabled={submitting}><IcoChevronLeft /></button>
      )}
      <span style={{ flex: 1, fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      {onClose && (
        <button style={btn} onClick={onClose} disabled={submitting}><IcoClose /></button>
      )}
    </div>
  )
}

/* 푸터 링크 — button·a·구분점을 같은 높이/정렬로 통일 */
const footerLink: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 8px',
  background: 'none', border: 'none', cursor: 'pointer', minHeight: 'unset',
  fontSize: 13, color: 'var(--color-text-sub)',
}
const footerDot: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', height: 30,
  fontSize: 13, color: 'var(--color-text-placeholder)',
}

/* ── 설정 메인 ── */
export function SettingsMainPage({
  isDark, onSetTheme, onNavigate,
}: {
  isDark: boolean
  onSetTheme: (theme: 'light' | 'dark') => void
  onNavigate: (page: Page) => void
}) {
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px',
    backgroundColor: 'var(--color-surface-card)',
    border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', minHeight: 'unset',
    borderBottom: '1px solid var(--color-border)',
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-surface-bg)', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
      {/* 카드 1: 화면 모드 */}
      <div style={{ margin: '16px 16px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <div style={{ ...row, cursor: 'default', borderBottom: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-sub)" strokeWidth={1.8} strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>화면 모드</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 1 }}>{isDark ? '다크' : '라이트'}</div>
          </div>
          {/* 토글 스위치 */}
          <button
            onClick={() => onSetTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            style={{
              width: 76, height: 40, borderRadius: 999, padding: 4,
              border: '1px solid var(--color-border)',
              backgroundColor: isDark ? 'var(--color-surface-card)' : 'var(--color-surface-raised)',
              boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0,
              minHeight: 'unset',
            }}
          >
            <div style={{ position: 'absolute', width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-surface-bg)', boxShadow: '0 1px 6px rgba(0,0,0,0.18)', left: isDark ? 40 : 4, transition: 'left 240ms cubic-bezier(0.4,0,0.2,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? 'var(--color-text-caption)' : 'var(--color-warning)', zIndex: 1 }}>
              {isDark
                ? <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
                : <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              }
            </div>
            <div style={{ width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)', opacity: isDark ? 0.2 : 0 }}><Sun size={16} strokeWidth={2.5} color="currentColor" /></div>
            <div style={{ width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isDark ? 0 : 0.3, color: 'var(--color-text-body)' }}><Moon size={16} strokeWidth={2.5} color="currentColor" /></div>
          </button>
        </div>
      </div>

      {/* 카드 2: 버그 리포트 */}
      <div style={{ margin: '12px 16px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <button style={{ ...row, borderBottom: 'none' }} onClick={() => onNavigate('report')}>
          <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-sub)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>버그 리포트</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 1 }}>오류·깨짐을 알려주세요</div>
          </div>
          <span style={{ color: 'var(--color-text-placeholder)' }}><IcoChevronRight /></span>
        </button>
      </div>

      {/* 안내 배너 */}
      <div style={{ margin: '12px 16px 0', backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface-bg))', border: '1px solid color-mix(in srgb, var(--color-warning) 25%, transparent)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth={2} strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-text-sub)' }}>
          상영 정보는 실시간으로 불러오지 않으므로 실제 좌석 현황과 다를 수 있습니다.
        </p>
      </div>

      {/* 푸터 링크 */}
      <div style={{ margin: '24px 16px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <button onClick={() => onNavigate('attribution')} style={footerLink}>출처 표기 정보</button>
        <span style={footerDot}>·</span>
        <button onClick={() => onNavigate('about')} style={footerLink}>만든 사람</button>
        <span style={footerDot}>·</span>
        <Link href="/privacy" style={{ ...footerLink, textDecoration: 'none' }}>개인정보 처리방침</Link>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--color-text-placeholder)' }}>
        영화볼지도 · v0.1.0
      </div>
    </div>
  )
}

/* ── 버그 리포트 전송 완료 ── */
export function ReportSuccessNotice() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, backgroundColor: 'var(--color-surface-bg)' }}>
      <HeartHandshake size={48} strokeWidth={1.5} color="var(--color-text-sub)" />
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>감사합니다!</div>
      <div style={{ fontSize: 13.5, color: 'var(--color-text-sub)', textAlign: 'center', lineHeight: 1.6 }}>제보해 주셔서 감사합니다.<br/>확인 후 이메일로 답변 드리겠습니다.</div>
    </div>
  )
}

/* ── 버그 리포트 ── */
export function SettingsReportPage({
  selectedMovieId, selectedTheaterName, onSuccess,
}: {
  selectedMovieId?: string | null
  selectedTheaterName?: string
  onSuccess: () => void
}) {
  const [category, setCategory] = useState('')
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
      if (selectedMovieId) form.set('movie_id', selectedMovieId)
      if (selectedTheaterName) form.set('theater_name', selectedTheaterName)
      files.forEach(f => form.append('screenshots', f))
      const res = await fetch('/api/report', { method: 'POST', body: form })
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
    padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-bg)',
    color: 'var(--color-text-primary)',
    fontSize: 14, resize: 'none', outline: 'none',
    fontFamily: 'var(--font-sans)',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 18, backgroundColor: 'var(--color-surface-bg)' }}>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-sub)', lineHeight: 1.55 }}>
        발견하신 오류를 알려주세요. 어떤 화면에서 무엇이 잘못됐는지 적어주시면 큰 도움이 됩니다.
      </p>

      {/* 분류 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 8 }}>분류</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REPORT_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer', minHeight: 'unset',
              border: category === cat ? '1px solid var(--color-primary-base)' : '1px solid var(--color-border)',
              backgroundColor: category === cat ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-bg)',
              color: category === cat ? 'var(--color-primary-text)' : 'var(--color-text-body)',
            }}>{cat}</button>
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
        <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-placeholder)', marginTop: 4 }}>{detail.length}/500</div>
      </div>

      {/* 스크린샷 */}
      <div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files ?? []).slice(0, 3))} />
        <button onClick={() => fileInputRef.current?.click()} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999,
          border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-bg)',
          fontSize: 13, fontWeight: 500, color: 'var(--color-text-body)', cursor: 'pointer', minHeight: 'unset',
        }}>
          <IcoCamera /> 스크린샷 첨부
        </button>
        {files.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-caption)' }}>
            {files.map(f => f.name).join(', ')}
          </div>
        )}
      </div>

      {/* 이메일 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 8 }}>회신 이메일 (선택)</div>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ ...inputStyle }} />
      </div>

      {/* 동의 */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--color-primary-base)', flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: 'var(--color-text-sub)', lineHeight: 1.5 }}>
          제출하는 내용과 스크린샷이 서비스 개선 목적으로 사용될 수 있음에 동의합니다.
        </span>
      </label>

      {error && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-error)' }}>{error}</p>}

      {/* 전송 버튼 */}
      <button onClick={handleSubmit} disabled={!canSubmit} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 48, borderRadius: 12, border: 'none', cursor: canSubmit ? 'pointer' : 'default',
        backgroundColor: canSubmit ? 'var(--color-primary-base)' : 'var(--color-surface-raised)',
        color: canSubmit ? '#fff' : 'var(--color-text-placeholder)',
        fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)',
        transition: 'background-color 150ms',
      }}>
        <IcoSend /> {submitting ? '전송 중…' : '리포트 보내기'}
      </button>
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
    padding: '8px 14px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.6px',
    color: 'var(--color-text-placeholder)', textTransform: 'uppercase',
  }
  const valueBox: React.CSSProperties = {
    margin: '6px 14px', padding: '8px 12px', borderRadius: 8,
    backgroundColor: 'var(--color-surface-bg)',
    fontSize: 12.5, color: 'var(--color-text-sub)', fontFamily: 'var(--font-mono)',
  }
  const linkRow: React.CSSProperties = {
    padding: '8px 14px 12px',
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 13, fontWeight: 500, color: 'var(--color-primary-base)', cursor: 'pointer',
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-surface-bg)', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
      {/* 지도 데이터 */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-sub)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-placeholder)', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 600 }}>지도 데이터</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>OpenStreetMap</div>
          </div>
        </div>
        <div style={valueBox}>© OpenStreetMap contributors</div>
        <button onClick={() => window.open('https://www.openstreetmap.org/copyright', '_blank', 'noopener')} style={{ ...linkRow as React.CSSProperties, background: 'none', border: 'none' }}>
          www.openstreetmap.org/copyright <IcoExternalLink />
        </button>
      </div>

      {/* 서체 */}
      <div style={card}>
        <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-sub)' }}>T</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-placeholder)', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 600 }}>서체</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>KIMM 서체</div>
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
        <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', marginBottom: 12 }}>
          <img src="/squarelogo.svg" alt="영화볼지도" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>영화볼지도</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 2, fontStyle: 'italic', fontFamily: 'var(--font-serif-en)' }}>independent cinema map</div>
      </div>

      {/* 만든 사람 */}
      <div style={{ margin: '0 16px', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)' }}>
        <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--color-text-placeholder)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>만든 사람</div>
        {team.map((member, i) => (
          <div key={member.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < team.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>{member.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 1 }}>{member.role}</div>
            </div>
            {member.linkedin && (
              <button onClick={() => window.open(member.linkedin!, '_blank', 'noopener')} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', backgroundColor: '#0A66C2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, minHeight: 'unset' }}>
                <IcoLinkedIn />
              </button>
            )}
            {member.github && (
              <button onClick={() => window.open(member.github!, '_blank', 'noopener')} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', backgroundColor: '#24292e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, minHeight: 'unset' }}>
                <IcoGitHub />
              </button>
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
  isDark,
  onSetTheme,
  selectedMovieId,
  selectedTheaterName,
}: {
  isOpen: boolean
  onClose: () => void
  isDesktopLayout: boolean
  isDark: boolean
  onSetTheme: (theme: 'light' | 'dark') => void
  selectedMovieId?: string | null
  selectedTheaterName?: string
}) {
  const [page, setPage] = useState<Page>('main')
  const [reportSuccess, setReportSuccess] = useState(false)

  const handleClose = () => {
    onClose()
    // 닫힌 후 페이지 리셋
    setTimeout(() => { setPage('main'); setReportSuccess(false) }, 300)
  }

  const handleBack = () => setPage('main')

  const pageTitle: Record<Page, string> = {
    main: '설정',
    report: '버그 리포트',
    attribution: '출처 표기',
    about: '만든 사람',
  }

  if (!isOpen) return null

  const content = (
    <div
      onClick={e => e.stopPropagation()}
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
      }}
    >
      <SettingsHeader
        title={pageTitle[page]}
        onBack={page !== 'main' ? handleBack : undefined}
        onClose={handleClose}
        submitting={false}
      />

      {page === 'main' && (
        <SettingsMainPage isDark={isDark} onSetTheme={onSetTheme} onNavigate={setPage} />
      )}
      {page === 'report' && !reportSuccess && (
        <SettingsReportPage
          selectedMovieId={selectedMovieId}
          selectedTheaterName={selectedTheaterName}
          onSuccess={() => setReportSuccess(true)}
        />
      )}
      {page === 'report' && reportSuccess && <ReportSuccessNotice />}
      {page === 'attribution' && <SettingsAttributionPage />}
      {page === 'about' && <SettingsAboutPage />}
    </div>
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 2100,
        height: '100dvh',
        backgroundColor: 'rgba(0,0,0,0.38)',
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
