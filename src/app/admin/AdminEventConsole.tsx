'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/primitives'
import type {
  AdminEventSource,
  AdminMovie,
  AdminShowtimeStatus,
  AdminTheater,
  CrawledEventCandidate,
  EventType,
} from '@/types/admin'
import styles from './admin.module.css'
import { Confidence, Metric, StatusBadge } from './adminShowtimeConsole/badges'

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  gv: 'GV',
  talk: '토크',
  overnight: '밤샘',
  special: '특별',
  masterclass: '마스터클래스',
}

function EventTypeBadge({ type }: { type: EventType }) {
  const colors: Record<EventType, string> = {
    gv: '#2e7d32',
    talk: '#1565c0',
    overnight: '#6a1b9a',
    special: '#c62828',
    masterclass: '#e65100',
  }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 700,
      color: '#fff',
      background: colors[type] ?? '#555',
      letterSpacing: '0.3px',
    }}>
      {EVENT_TYPE_LABEL[type] ?? type}
    </span>
  )
}

interface EventCrawlResult {
  sourceId: string
  theaterName: string
  status: 'completed' | 'failed'
  total: number
  created: number
  skipped: number
  candidates: CrawledEventCandidate[]
  error?: string
}

export function AdminEventConsole() {
  const router = useRouter()
  const [sources, setSources] = useState<AdminEventSource[]>([])
  const [candidates, setCandidates] = useState<CrawledEventCandidate[]>([])
  const [adminTheaters, setAdminTheaters] = useState<AdminTheater[]>([])
  const [adminMovies, setAdminMovies] = useState<AdminMovie[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminShowtimeStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [matchDrafts, setMatchDrafts] = useState<Record<string, { matchedTheaterId?: string; matchedMovieId?: string }>>({})
  const [latestIds, setLatestIds] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    refresh()
    refreshTheaters()
    refreshMovies()
  }, [])

  async function refresh() {
    const [srcRes, candRes] = await Promise.all([
      fetch('/api/admin/events?type=sources', { cache: 'no-store' }),
      fetch('/api/admin/events?type=candidates', { cache: 'no-store' }),
    ])

    if (srcRes.status === 401 || srcRes.status === 403) {
      router.replace('/admin/login')
      return
    }

    const srcs = await srcRes.json() as AdminEventSource[]
    const cands = await candRes.json() as CrawledEventCandidate[]

    setSources(Array.isArray(srcs) ? srcs : [])
    setCandidates(Array.isArray(cands) ? cands : [])
  }

  async function refreshTheaters() {
    const res = await fetch('/api/admin/theaters', { cache: 'no-store' })
    const data = await res.json() as { theaters?: AdminTheater[] }
    if (data.theaters) setAdminTheaters(data.theaters)
  }

  async function refreshMovies() {
    const res = await fetch('/api/admin/movies', { cache: 'no-store' })
    const data = await res.json() as { movies?: AdminMovie[] }
    if (data.movies) setAdminMovies(data.movies)
  }

  async function signOut() {
    await fetch('/api/admin/session', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  async function runCrawl() {
    if (!selectedSourceId) {
      setMessage('이벤트 소스를 먼저 선택하세요.')
      return
    }
    setLoading(true)
    setMessage('크롤링 중...')
    try {
      const res = await fetch('/api/admin/events/crawl', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId: selectedSourceId }),
      })
      const result = await res.json() as EventCrawlResult
      if (result.status === 'failed') throw new Error(result.error ?? '크롤링 실패')

      const newIds = result.candidates.map((c) => c.id)
      setLatestIds(newIds)
      setSelectedIds(newIds)
      setStatusFilter('all')
      setPage(0)
      await refresh()
      setMessage(`${result.theaterName}: ${result.total}개 수집, ${result.created}개 신규, ${result.skipped}개 중복`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '크롤링 실패')
    } finally {
      setLoading(false)
    }
  }

  async function runAllCrawls() {
    const enabled = sources.filter((s) => s.enabled && s.health === 'healthy')
    if (!enabled.length) {
      setMessage('활성화된 이벤트 소스가 없습니다.')
      return
    }
    setLoading(true)
    setMessage(`일괄 크롤링 중... (0/${enabled.length})`)

    let completed = 0
    let totalCreated = 0
    const allNewIds: string[] = []

    await Promise.all(
      enabled.map((source) =>
        fetch('/api/admin/events/crawl', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sourceId: source.id }),
        })
          .then((r) => r.json() as Promise<EventCrawlResult>)
          .then((result) => {
            completed++
            totalCreated += result.created ?? 0
            allNewIds.push(...(result.candidates ?? []).map((c) => c.id))
            setMessage(`일괄 크롤링 중... (${completed}/${enabled.length})`)
          })
          .catch(() => { completed++ }),
      ),
    )

    setLatestIds(allNewIds)
    setSelectedIds(allNewIds)
    setStatusFilter('all')
    setPage(0)
    await refresh()
    setMessage(`일괄 크롤링 완료: ${enabled.length}개 소스, ${totalCreated}개 신규`)
    setLoading(false)
  }

  async function saveMatch(candidateId: string) {
    const draft = matchDrafts[candidateId]
    if (!draft) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/events/matches', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          matchedTheaterId: draft.matchedTheaterId || undefined,
          matchedMovieId: draft.matchedMovieId || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json() as { error?: { message: string } }).error?.message ?? '저장 실패')
      await refresh()
      setMatchDrafts((current) => { const next = { ...current }; delete next[candidateId]; return next })
      setMessage('매칭 저장 완료')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(action: 'approve' | 'reject') {
    if (!selectedIds.length) {
      setMessage('항목을 먼저 선택하세요.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/events/approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action }),
      })
      const result = await res.json() as { approved?: unknown[]; rejected?: number; error?: { message: string } }
      if (!res.ok && res.status !== 422) throw new Error(result.error?.message ?? '처리 실패')

      await refresh()
      setSelectedIds([])
      setMessage(action === 'approve'
        ? `${(result.approved ?? []).length}개 승인 완료`
        : `${result.rejected ?? selectedIds.length}개 반려 완료`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '처리 실패')
    } finally {
      setLoading(false)
    }
  }

  const latestIdSet = useMemo(() => new Set(latestIds), [latestIds])

  const filtered = useMemo(() => {
    let list = candidates
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter)
    const q = searchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) =>
      [c.movieTitle, c.theaterName, c.title, c.eventDate, c.guests.join(' ')].join(' ').toLowerCase().includes(q),
    )
  }, [candidates, statusFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const visible = useMemo(() => filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE), [filtered, safePage])

  const filteredIds = useMemo(() => filtered.map((c) => c.id), [filtered])
  const selectedInView = filteredIds.filter((id) => selectedIds.includes(id)).length
  const allSelected = filteredIds.length > 0 && selectedInView === filteredIds.length
  const someSelected = selectedInView > 0 && selectedInView < filteredIds.length

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected
  }, [someSelected])

  function toggleSelected(id: string) {
    setSelectedIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
  }

  function toggleAll() {
    setSelectedIds((cur) => {
      const visible = new Set(filteredIds)
      const hidden = cur.filter((id) => !visible.has(id))
      return allSelected ? hidden : [...hidden, ...filteredIds]
    })
  }

  function updateMatchDraft(candidateId: string, key: 'matchedTheaterId' | 'matchedMovieId', value: string) {
    const candidate = candidates.find((c) => c.id === candidateId)
    setMatchDrafts((cur) => ({
      ...cur,
      [candidateId]: {
        matchedTheaterId: cur[candidateId]?.matchedTheaterId ?? candidate?.matchedTheaterId,
        matchedMovieId: cur[candidateId]?.matchedMovieId ?? candidate?.matchedMovieId,
        [key]: value || undefined,
      },
    }))
  }

  const draftCount = candidates.filter((c) => c.status === 'draft').length
  const reviewCount = candidates.filter((c) => c.status === 'needs_review').length
  const approvedCount = candidates.filter((c) => c.status === 'approved').length
  const latestCount = candidates.filter((c) => latestIdSet.has(c.id)).length
  const selectedSource = sources.find((s) => s.id === selectedSourceId)

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>운영자 콘솔</p>
          <h1>이벤트 등록·검수</h1>
        </div>
        <div className={styles.headerActions}>
          <Button variant="ghost" size="sm" onClick={signOut}>로그아웃</Button>
          <Button variant="ghost" size="sm" onClick={refresh}>새로고침</Button>
          <Button variant="secondary" size="sm" loading={loading} onClick={runAllCrawls}>일괄 수집</Button>
          <Button size="sm" loading={loading} onClick={runCrawl}>수집 실행</Button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="이벤트 운영 지표">
        <Metric label="수집 후보" value={candidates.length} />
        <Metric label="초안" value={draftCount} />
        <Metric label="검수 필요" value={reviewCount} tone={reviewCount ? 'warning' : 'default'} />
        <Metric label="승인 완료" value={approvedCount} tone={approvedCount ? 'success' : 'default'} />
        <Metric label="최근 수집" value={latestCount} />
      </section>

      <section className={styles.workspace}>
        {/* ── 소스 패널 ── */}
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>이벤트 소스</h2>
          </div>
          <div className={styles.sourceList}>
            {sources.map((source) => (
              <button
                key={source.id}
                className={`${styles.sourceItem} ${selectedSourceId === source.id ? styles.sourceItemActive : ''}`}
                onClick={() => setSelectedSourceId(source.id)}
              >
                <span>
                  <strong>{source.theaterName}</strong>
                  <small>{source.parser} · {source.cadence}</small>
                </span>
                <i className={styles[source.health]}>{source.health}</i>
              </button>
            ))}
            {sources.length === 0 && (
              <p className={styles.emptyLog}>이벤트 소스가 없습니다. seed:event-sources를 실행하세요.</p>
            )}
          </div>
          {selectedSource && (
            <div className={styles.sourceNotes}>
              <strong>{selectedSource.listingUrl}</strong>
              <p>{selectedSource.notes}</p>
            </div>
          )}
        </aside>

        {/* ── 검수 패널 ── */}
        <section className={styles.reviewPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>검수 대기열</h2>
              <span>극장·영화 매칭 후 승인하면 theater_events 테이블에 등록됩니다.</span>
            </div>
            <div className={styles.reviewActions}>
              <Button variant="ghost" size="sm" loading={loading} onClick={() => handleApprove('reject')}>반려</Button>
              <Button size="sm" loading={loading} onClick={() => handleApprove('approve')}>승인</Button>
            </div>
          </div>

          {message && <p className={styles.message}>{message}</p>}

          <div className={styles.candidateFilterRow}>
            <div className={styles.candidateFilterTabs}>
              {([
                { key: 'all' as const, label: '전체', count: candidates.length, dot: '' },
                { key: 'draft' as const, label: '초안', count: draftCount, dot: '' },
                { key: 'needs_review' as const, label: '검수', count: reviewCount, dot: '#e67e22' },
                { key: 'approved' as const, label: '승인', count: approvedCount, dot: '#2e7d32' },
              ]).map(({ key, label, count, dot }) => (
                <button
                  key={key}
                  className={`${styles.filterTab} ${statusFilter === key ? styles.filterTabActive : ''}`}
                  onClick={() => { setStatusFilter(key); setPage(0) }}
                >
                  {dot && <span className={styles.filterTabDot} style={{ background: dot }} />}
                  {label}
                  {count > 0 && <span className={styles.filterTabBadge}>{count}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.reviewToolbar}>
            <input
              aria-label="이벤트 검색"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0) }}
              placeholder="영화명, 극장, 날짜, 게스트 검색"
            />
            <span>{filtered.length}/{candidates.length}건</span>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-label="전체 선택">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      disabled={filteredIds.length === 0}
                      aria-label="전체 선택"
                      onChange={toggleAll}
                    />
                  </th>
                  <th>이벤트</th>
                  <th>극장</th>
                  <th>매칭</th>
                  <th>품질</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const isUnmatched = !c.matchedTheaterId
                  const hasWarning = c.warnings.length > 0
                  const isLatest = latestIdSet.has(c.id)
                  const rowClass = isUnmatched ? styles.rowUnmatched : hasWarning ? styles.rowWarning : ''

                  return (
                    <tr key={c.id} className={rowClass} style={isLatest ? { background: 'rgba(52,152,219,0.07)' } : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelected(c.id)}
                        />
                      </td>
                      <td>
                        <EventTypeBadge type={c.eventType} />
                        <strong style={{ marginLeft: 6 }}>{c.movieTitle ?? c.title}</strong>
                        <span>{c.eventDate}{c.eventTime ? ` ${c.eventTime}` : ''}</span>
                        {c.guests.length > 0 && (
                          <small>{c.guests.join(', ')}</small>
                        )}
                        {c.warnings.length > 0 && (
                          <ul className={styles.warnings}>
                            {c.warnings.map((w) => <li key={w}>{w}</li>)}
                          </ul>
                        )}
                      </td>
                      <td>
                        <strong>{c.theaterName}</strong>
                        <span>{c.sourceId}</span>
                      </td>
                      <td>
                        <div className={styles.matchControls}>
                          <label>
                            극장
                            <select
                              value={matchDrafts[c.id]?.matchedTheaterId ?? c.matchedTheaterId ?? ''}
                              onChange={(e) => updateMatchDraft(c.id, 'matchedTheaterId', e.target.value)}
                            >
                              <option value="">선택 안 함</option>
                              {adminTheaters.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            영화 (선택)
                            <select
                              value={matchDrafts[c.id]?.matchedMovieId ?? c.matchedMovieId ?? ''}
                              onChange={(e) => updateMatchDraft(c.id, 'matchedMovieId', e.target.value)}
                            >
                              <option value="">없음</option>
                              {adminMovies.map((m) => (
                                <option key={m.id} value={m.id}>{m.title} ({m.year})</option>
                              ))}
                            </select>
                          </label>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!matchDrafts[c.id]}
                            loading={loading && Boolean(matchDrafts[c.id])}
                            onClick={() => saveMatch(c.id)}
                          >
                            저장
                          </Button>
                        </div>
                      </td>
                      <td>
                        <Confidence value={c.confidence} />
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {candidates.length === 0 && (
              <div className={styles.empty}>
                소스를 선택하고 수집 실행을 누르면 이벤트 후보가 표시됩니다.
              </div>
            )}
            {candidates.length > 0 && filtered.length === 0 && (
              <div className={styles.empty}>
                검색 조건에 맞는 이벤트 후보가 없습니다.
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                ‹ 이전
              </button>
              <span>{safePage + 1} / {totalPages}</span>
              <button className={styles.pageBtn} disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                다음 ›
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
