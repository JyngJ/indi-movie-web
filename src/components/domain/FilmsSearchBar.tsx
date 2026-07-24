'use client'

import { useEffect, useRef, useState } from 'react'
import { usePendingNavItem } from '@/hooks/usePendingNavItem'
import { SearchBar, SearchBarButton } from '@/components/primitives'
import { AddRequestModal, AddRequestCtaButton } from '@/components/domain/AddRequestModal'
// 지도 탭과 검색 기록을 공유 — 같은 localStorage 키를 쓰는 지도 쪽 유틸을 그대로 재사용한다.
// 지도에서 검색한 극장/영화가 상영작 탭 "최근 검색"에도 보이고, 그 반대도 마찬가지.
import { loadRecentSearches, addToRecent, clearRecentSearches } from '@/lib/map/searchUtils'
import type { Movie, Theater } from '@/types/api'
import type { Festival } from '@/types/festival'

interface Props {
  movies: Movie[]
  theaters: Theater[]
  festivals: Festival[]
  isDesktop: boolean
}

const HINTS = [
  { cat: '영화관', ex: '서울아트시네마' },
  { cat: '영화',   ex: '레오파드' },
  { cat: '감독',   ex: '홍상수' },
  { cat: '영화제', ex: '정동진독립영화제' },
] as const

const TYPE_LABEL: Record<string, string> = { movie: '영화', director: '감독', theater: '영화관', festival: '영화제' }

type Suggestion = { type: 'movie' | 'director' | 'theater' | 'festival'; label: string; navigateTo: string }

// 한글 자모 분해: 받침까지 낱자로 풀어서 substring 비교 — 미완성 음절("에뭇"→"에무시") 처리
const CHO  = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('')
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'.split('')
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'.split('')

function decomposeKo(text: string): string {
  return text.split('').map(ch => {
    const c = ch.charCodeAt(0) - 0xAC00
    if (c < 0 || c > 11171) return ch
    const jong = c % 28
    return CHO[Math.floor(c / 588)] + JUNG[Math.floor(c / 28) % 21] + (jong ? JONG[jong] : '')
  }).join('')
}

function koMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().replace(/\s/g, '')
  const t = target.toLowerCase().replace(/\s/g, '')
  return t.includes(q) || decomposeKo(t).includes(decomposeKo(q))
}

function buildSuggestions(iv: string, movies: Movie[], theaters: Theater[], festivals: Festival[]): Suggestion[] {
  if (!iv) return []
  const seen = new Set<string>()
  const out: Suggestion[] = []

  for (const f of festivals) {
    if (koMatch(iv, f.name) && !seen.has(f.name)) {
      seen.add(f.name)
      out.push({ type: 'festival', label: f.name, navigateTo: `/festival/${f.slug}` })
    }
    if (out.length >= 3) break
  }
  for (const m of movies) {
    if (koMatch(iv, m.title) && !seen.has(m.title)) {
      seen.add(m.title)
      out.push({ type: 'movie', label: m.title, navigateTo: `/films/movie/${m.id}` })
      if (out.length >= 4) break
    }
  }
  for (const m of movies) {
    for (const d of m.director) {
      if (koMatch(iv, d) && !seen.has(d)) {
        seen.add(d)
        out.push({ type: 'director', label: d, navigateTo: `/films/director/${encodeURIComponent(d)}` })
      }
    }
    if (out.length >= 6) break
  }
  for (const t of theaters) {
    if (koMatch(iv, t.name) && !seen.has(t.name)) {
      seen.add(t.name)
      out.push({ type: 'theater', label: t.name, navigateTo: `/films/theater/${t.id}` })
    }
    if (out.length >= 8) break
  }

  return out.slice(0, 7)
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const lq = query.toLowerCase()
  const lt = text.toLowerCase()
  const idx = lt.indexOf(lq)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ fontWeight: 700, color: 'var(--color-primary-base)' }}>{text.slice(idx, idx + lq.length)}</span>
      {text.slice(idx + lq.length)}
    </>
  )
}

const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
)
const CloseIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export function FilmsSearchBar({ movies, theaters, festivals, isDesktop }: Props) {
  const { pendingId: navPendingId, navigate } = usePendingNavItem()

  const [history, setHistory]    = useState<string[]>([])
  const [focused, setFocused]    = useState(false)
  const [query, setQuery]        = useState('')
  const [hoveredIdx, setHovered] = useState<number | null>(null)
  const [arrowIdx, setArrowIdx]  = useState<number | null>(null)
  const [mOpen, setMOpen]        = useState(false)
  const [mInput, setMInput]      = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestQuery, setRequestQuery] = useState('')

  const desktopRef = useRef<HTMLInputElement>(null)
  const mobileRef  = useRef<HTMLInputElement>(null)
  const wrapRef    = useRef<HTMLDivElement>(null)

  useEffect(() => { setHistory(loadRecentSearches()) }, [])

  useEffect(() => {
    if (!isDesktop || !focused) return
    function onMD(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener('mousedown', onMD)
    return () => document.removeEventListener('mousedown', onMD)
  }, [isDesktop, focused])

  useEffect(() => {
    if (!isDesktop || !focused) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setFocused(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isDesktop, focused])

  function addToHistory(q: string) {
    setHistory(addToRecent(q, history))
  }

  function navigateDirect(s: Suggestion) {
    addToHistory(s.label)
    navigate(s.label, s.navigateTo)
    setFocused(false)
    setArrowIdx(null)
    desktopRef.current?.blur()
  }

  function mobileNavigate(s: Suggestion) {
    addToHistory(s.label)
    navigate(s.label, s.navigateTo)
    setMOpen(false)
    setMInput('')
  }

  function mobileSubmit() {
    const sug = buildSuggestions(mInput.trim().toLowerCase(), movies, theaters, festivals)
    if (sug[0]) mobileNavigate(sug[0])
    else { setMOpen(false); setMInput('') }
  }

  // ── Desktop ───────────────────────────────────────────────────
  if (isDesktop) {
    const ACCENT = 'var(--color-primary-base)'
    const iv = query.trim().toLowerCase()
    const typingSuggestions = buildSuggestions(iv, movies, theaters, festivals)
    const isTyping = iv.length > 0

    return (
      <>
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', zIndex: focused ? 45 : 1 }}>

        {/* ── Search bar ── */}
        {!focused && !query ? (
          <SearchBarButton
            placeholder="영화, 영화관, 감독, 영화제 검색"
            onClick={() => {
              setFocused(true)
              requestAnimationFrame(() => desktopRef.current?.focus())
            }}
          />
        ) : (
          <div
            onClick={() => desktopRef.current?.focus()}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              height: 44, paddingLeft: 16, paddingRight: 10,
              backgroundColor: 'var(--color-surface-card)',
              border: `1.5px solid ${ACCENT}`,
              borderBottom: 'none',
              borderRadius: '22px 22px 0 0',
              cursor: 'text',
            }}
          >
          <span style={{ flexShrink: 0, display: 'flex', color: focused ? ACCENT : 'var(--color-text-body)' }}>
            <SearchIcon size={16} />
          </span>
          <input
            ref={desktopRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setArrowIdx(null) }}
            onFocus={() => setFocused(true)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setArrowIdx(prev => prev === null ? 0 : Math.min(prev + 1, typingSuggestions.length - 1))
                return
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setArrowIdx(prev => (prev === null || prev === 0) ? null : prev - 1)
                return
              }
              if (e.key === 'Enter') {
                const target = (arrowIdx !== null ? typingSuggestions[arrowIdx] : null) ?? typingSuggestions[0] ?? null
                if (target) navigateDirect(target)
                else setFocused(false)
              }
            }}
            placeholder="영화, 영화관, 감독, 영화제 검색"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'none', minWidth: 0,
              fontSize: 14, color: 'var(--color-text-primary)', caretColor: ACCENT,
            }}
          />
          {query && (
            <button
              onMouseDown={e => { e.preventDefault(); setQuery(''); desktopRef.current?.focus() }}
              style={{ flexShrink: 0, display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-caption)', minHeight: 'unset' }}
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>
        )}

        {/* ── Dropdown ── */}
        {focused && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            backgroundColor: 'var(--color-surface-card)',
            border: `1.5px solid ${ACCENT}`, borderTop: 'none',
            borderRadius: '0 0 16px 16px',
            boxShadow: '0 6px 20px rgba(20,15,10,0.12)',
            overflow: 'hidden', zIndex: 50,
          }}>
            {isTyping ? (
              typingSuggestions.length > 0 ? (
                <>
                  {typingSuggestions.map((s, i) => (
                    <button
                      key={s.label}
                      onMouseDown={e => { e.preventDefault(); navigateDirect(s) }}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: (arrowIdx === i || hoveredIdx === i) ? 'var(--color-surface-raised)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 'unset', opacity: navPendingId === s.label ? 0.5 : 1 }}
                    >
                      <span style={{ flexShrink: 0, display: 'flex', color: 'var(--color-text-caption)' }}>
                        <SearchIcon size={14} />
                      </span>
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <HighlightMatch text={s.label} query={query} />
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-caption)', flexShrink: 0 }}>
                        {TYPE_LABEL[s.type]}
                      </span>
                    </button>
                  ))}
                  <div style={{ height: 6 }} />
                </>
              ) : (
                <div style={{ padding: '14px 16px 18px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-caption)' }}>
                    &ldquo;{query}&rdquo;와 일치하는 결과가 없습니다
                  </p>
                  <AddRequestCtaButton onClick={() => { setRequestQuery(query); setRequestOpen(true) }} />
                </div>
              )
            ) : (
              <>
                <p style={{ padding: '10px 16px 8px', margin: 0, fontSize: 12, color: 'var(--color-text-caption)', letterSpacing: '-0.1px' }}>
                  영화관, 영화, 감독을 모두 검색할 수 있어요.
                </p>
                <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '0 12px 3px' }} />
                {HINTS.map(({ cat, ex }) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 16px' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-caption)', width: 38, flexShrink: 0 }}>{cat}</span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-placeholder)' }}>&ldquo;{ex}&rdquo;</span>
                  </div>
                ))}
                <div style={{ height: 6 }} />
              </>
            )}
          </div>
        )}
      </div>
      <AddRequestModal open={requestOpen} query={requestQuery} onClose={() => setRequestOpen(false)} />
      </>
    )
  }

  // ── Mobile ─────────────────────────────────────────────────────
  if (!mOpen) {
    return (
      <div style={{ width: '100%' }}>
        <SearchBarButton
          placeholder="영화, 영화관, 감독, 영화제 검색"
          onClick={() => { setMInput(''); setMOpen(true); setTimeout(() => mobileRef.current?.focus(), 80) }}
        />
      </div>
    )
  }

  // Mobile overlay
  const miv = mInput.trim().toLowerCase()
  const mobileSuggestions = buildSuggestions(miv, movies, theaters, festivals)

  return (
    <>
      <div style={{ height: 'var(--comp-search-height)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'var(--color-surface-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingLeft: 16, paddingRight: 16, paddingBottom: 12, borderBottom: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <SearchBar
              ref={mobileRef}
              value={mInput}
              placeholder="영화, 영화관, 감독, 영화제 검색"
              inputFontSize={16}
              onChange={e => setMInput(e.target.value)}
              onClear={() => setMInput('')}
              onBack={() => { setMOpen(false); setMInput('') }}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') mobileSubmit() }}
            />
          </div>
          <button
            onClick={mobileSubmit}
            style={{ flexShrink: 0, height: 36, paddingLeft: 14, paddingRight: 14, borderRadius: 'var(--comp-search-radius)', border: 'none', cursor: 'pointer', background: 'var(--color-primary-base)', color: '#fff', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', minHeight: 'unset' }}
          >
            찾기
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          {mInput.trim() ? (
            mobileSuggestions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {mobileSuggestions.map(s => (
                  <button
                    key={s.label}
                    onClick={() => mobileNavigate(s)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', minHeight: 'unset', opacity: navPendingId === s.label ? 0.5 : 1 }}
                  >
                    <span style={{ flexShrink: 0, display: 'flex', color: 'var(--color-text-caption)' }}><SearchIcon size={14} /></span>
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text-body)' }}>
                      <HighlightMatch text={s.label} query={mInput} />
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-caption)', flexShrink: 0 }}>{TYPE_LABEL[s.type]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginTop: 60 }}>
                <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--color-text-caption)' }}>
                  &ldquo;{mInput}&rdquo;와 일치하는 결과가 없습니다
                </p>
                <AddRequestCtaButton onClick={() => { setRequestQuery(mInput.trim()); setRequestOpen(true) }} />
              </div>
            )
          ) : (
            <>
              {history.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-caption)', margin: 0 }}>최근 검색</p>
                    <button onClick={() => { setHistory([]); clearRecentSearches() }} style={{ fontSize: 12, color: 'var(--color-text-caption)', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}>전체 삭제</button>
                  </div>
                  {history.map(q => (
                    <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ flexShrink: 0, display: 'flex', color: 'var(--color-text-caption)' }}><SearchIcon size={14} /></span>
                      <button onClick={() => setMInput(q)} style={{ flex: 1, background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: 14, color: 'var(--color-text-body)' }}>{q}</button>
                      <button onClick={() => setHistory(prev => prev.filter(h => h !== q))} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, color: 'var(--color-text-caption)', minHeight: 'unset' }}>
                        <CloseIcon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: history.length > 0 ? 8 : 20 }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-caption)' }}>
                  영화관, 영화, 감독을 모두 검색할 수 있어요.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
                  {HINTS.map(({ cat, ex }) => (
                    <div key={cat} style={{ display: 'flex', alignItems: 'baseline', gap: 10, lineHeight: 1.9 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-caption)', width: 44, flexShrink: 0 }}>{cat}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-caption)', opacity: 0.6 }}>"{ex}"</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <AddRequestModal open={requestOpen} query={requestQuery} onClose={() => setRequestOpen(false)} />
    </>
  )
}
