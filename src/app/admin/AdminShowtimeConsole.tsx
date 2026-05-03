'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/primitives'
import type {
  AdminShowtimeStatus,
  AdminTheaterSource,
  CrawledShowtimeCandidate,
  CrawlInputKind,
  CrawlRun,
} from '@/types/admin'
import styles from './admin.module.css'

interface AdminPayload {
  sources: AdminTheaterSource[]
  runs: CrawlRun[]
  candidates: CrawledShowtimeCandidate[]
}

const emptyPayload: AdminPayload = {
  sources: [],
  runs: [],
  candidates: [],
}

const inputKinds: Array<{ value: CrawlInputKind; label: string }> = [
  { value: 'fixture', label: '샘플 HTML' },
  { value: 'url', label: 'URL 크롤링' },
  { value: 'html', label: 'HTML 붙여넣기' },
  { value: 'csv', label: 'CSV 업로드' },
]

export function AdminShowtimeConsole() {
  const [payload, setPayload] = useState<AdminPayload>(emptyPayload)
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [inputKind, setInputKind] = useState<CrawlInputKind>('fixture')
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sourceFormOpen, setSourceFormOpen] = useState(false)
  const [sourceForm, setSourceForm] = useState({
    theaterName: '',
    homepageUrl: '',
    listingUrl: '',
    parser: 'tableText',
    cadence: 'manual',
    notes: '',
  })

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (!selectedSourceId && payload.sources[0]) {
      setSelectedSourceId(payload.sources[0].id)
      setUrl(payload.sources[0].listingUrl)
    }
  }, [payload.sources, selectedSourceId])

  const selectedSource = payload.sources.find((source) => source.id === selectedSourceId)
  const latestRun = payload.runs[0]
  const reviewCount = payload.candidates.filter((candidate) => candidate.status === 'needs_review').length
  const approvedCount = payload.candidates.filter((candidate) => candidate.status === 'approved').length
  const averageConfidence = useMemo(() => {
    if (!payload.candidates.length) return 0
    const total = payload.candidates.reduce((sum, candidate) => sum + candidate.confidence, 0)
    return Math.round((total / payload.candidates.length) * 100)
  }, [payload.candidates])

  async function refresh() {
    const response = await fetch('/api/admin/showtimes', { cache: 'no-store' })
    const next = (await response.json()) as AdminPayload
    setPayload(next)
  }

  async function runCrawler() {
    setLoading(true)
    setMessage('크롤링을 실행하는 중입니다.')

    try {
      const response = await fetch('/api/admin/crawl', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceId: selectedSourceId,
          inputKind,
          url: inputKind === 'url' ? url : undefined,
          content: inputKind === 'html' || inputKind === 'csv' ? content : undefined,
        }),
      })
      const result = (await response.json()) as CrawlRun

      if (!response.ok) {
        throw new Error(result.error ?? '크롤링에 실패했습니다.')
      }

      await refresh()
      setSelectedIds(result.candidates.map((candidate) => candidate.id))
      setMessage(`${result.sourceName}에서 ${result.candidates.length}개 후보를 수집했습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '크롤링에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(status: AdminShowtimeStatus) {
    if (!selectedIds.length) {
      setMessage('검수할 상영 회차를 먼저 선택하세요.')
      return
    }

    setLoading(true)
    try {
      await fetch('/api/admin/showtimes', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      })
      await refresh()
      setSelectedIds([])
      setMessage(status === 'approved' ? '선택한 회차를 업로드 대기 상태로 승인했습니다.' : '선택한 회차 상태를 변경했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function createSource() {
    setLoading(true)
    setMessage('크롤링 소스를 저장하는 중입니다.')

    try {
      const response = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sourceForm),
      })
      const result = (await response.json()) as { source?: AdminTheaterSource; error?: { message: string } }

      if (!response.ok || !result.source) {
        throw new Error(result.error?.message ?? '크롤링 소스를 저장하지 못했습니다.')
      }

      await refresh()
      setSelectedSourceId(result.source.id)
      setUrl(result.source.listingUrl)
      setInputKind('url')
      setSourceFormOpen(false)
      setSourceForm({
        theaterName: '',
        homepageUrl: '',
        listingUrl: '',
        parser: 'tableText',
        cadence: 'manual',
        notes: '',
      })
      setMessage(`${result.source.theaterName} 크롤링 소스를 추가했습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '크롤링 소스를 저장하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    )
  }

  function selectSource(sourceId: string) {
    const source = payload.sources.find((item) => item.id === sourceId)
    setSelectedSourceId(sourceId)
    if (source) setUrl(source.listingUrl)
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>운영자 콘솔</p>
          <h1>상영시간표 등록·검수</h1>
        </div>
        <div className={styles.headerActions}>
          <Button variant="ghost" size="sm" onClick={refresh}>새로고침</Button>
          <Button size="sm" loading={loading} onClick={runCrawler}>수집 실행</Button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="상영시간표 운영 지표">
        <Metric label="수집 후보" value={payload.candidates.length} />
        <Metric label="검수 필요" value={reviewCount} tone={reviewCount ? 'warning' : 'default'} />
        <Metric label="승인 완료" value={approvedCount} tone="success" />
        <Metric label="평균 신뢰도" value={`${averageConfidence}%`} />
      </section>

      <section className={styles.workspace}>
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>크롤링 소스</h2>
            <button className={styles.linkButton} onClick={() => setSourceFormOpen((open) => !open)}>
              {sourceFormOpen ? '닫기' : '새 소스'}
            </button>
          </div>

          {sourceFormOpen && (
            <div className={styles.sourceForm}>
              <label>
                극장명
                <input
                  value={sourceForm.theaterName}
                  onChange={(event) => setSourceForm((current) => ({ ...current, theaterName: event.target.value }))}
                  placeholder="예: 라이카시네마"
                />
              </label>
              <label>
                홈페이지 URL
                <input
                  value={sourceForm.homepageUrl}
                  onChange={(event) => setSourceForm((current) => ({ ...current, homepageUrl: event.target.value }))}
                  placeholder="https://cinema.example"
                />
              </label>
              <label>
                상영시간표 URL
                <input
                  value={sourceForm.listingUrl}
                  onChange={(event) => setSourceForm((current) => ({ ...current, listingUrl: event.target.value }))}
                  placeholder="https://cinema.example/schedule"
                />
              </label>
              <div className={styles.formGrid}>
                <label>
                  파서
                  <select
                    value={sourceForm.parser}
                    onChange={(event) => setSourceForm((current) => ({ ...current, parser: event.target.value }))}
                  >
                    <option value="tableText">HTML 테이블</option>
                    <option value="timelineCard">타임라인 카드</option>
                    <option value="jsonLdEvent">JSON-LD Event</option>
                    <option value="csv">CSV</option>
                  </select>
                </label>
                <label>
                  주기
                  <select
                    value={sourceForm.cadence}
                    onChange={(event) => setSourceForm((current) => ({ ...current, cadence: event.target.value }))}
                  >
                    <option value="manual">수동</option>
                    <option value="daily">매일</option>
                    <option value="twice_daily">하루 2회</option>
                  </select>
                </label>
              </div>
              <label>
                메모
                <textarea
                  value={sourceForm.notes}
                  onChange={(event) => setSourceForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="로그인 필요 여부, 표 구조, 검수 팁 등"
                />
              </label>
              <Button size="sm" fullWidth loading={loading} onClick={createSource}>소스 저장</Button>
            </div>
          )}

          <div className={styles.sourceList}>
            {payload.sources.map((source) => (
              <button
                key={source.id}
                className={`${styles.sourceItem} ${selectedSourceId === source.id ? styles.sourceItemActive : ''}`}
                onClick={() => selectSource(source.id)}
              >
                <span>
                  <strong>{source.theaterName}</strong>
                  <small>{source.parser} · {source.cadence}</small>
                </span>
                <i className={styles[source.health]}>{source.health}</i>
              </button>
            ))}
          </div>

          <div className={styles.crawlerBox}>
            <label>
              입력 방식
              <select value={inputKind} onChange={(event) => setInputKind(event.target.value as CrawlInputKind)}>
                {inputKinds.map((kind) => (
                  <option key={kind.value} value={kind.value}>{kind.label}</option>
                ))}
              </select>
            </label>

            {inputKind === 'url' && (
              <label>
                수집 URL
                <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
              </label>
            )}

            {(inputKind === 'html' || inputKind === 'csv') && (
              <label>
                원본 데이터
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={inputKind === 'csv' ? 'movieTitle,showDate,showTime,...' : '<article class="showtime">...</article>'}
                />
              </label>
            )}

            {selectedSource && (
              <div className={styles.sourceNotes}>
                <strong>{selectedSource.homepageUrl}</strong>
                <p>{selectedSource.notes}</p>
              </div>
            )}
          </div>
        </aside>

        <section className={styles.reviewPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>검수 대기열</h2>
              <span>중복 제거 fingerprint와 신뢰도 기준으로 정렬됩니다.</span>
            </div>
            <div className={styles.reviewActions}>
              <Button variant="secondary" size="sm" onClick={() => updateStatus('needs_review')}>재검수</Button>
              <Button variant="ghost" size="sm" onClick={() => updateStatus('rejected')}>반려</Button>
              <Button size="sm" onClick={() => updateStatus('approved')}>승인</Button>
            </div>
          </div>

          {message && <p className={styles.message}>{message}</p>}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-label="선택" />
                  <th>상영 정보</th>
                  <th>극장</th>
                  <th>좌석/가격</th>
                  <th>품질</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {payload.candidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(candidate.id)}
                        onChange={() => toggleSelected(candidate.id)}
                      />
                    </td>
                    <td>
                      <strong>{candidate.movieTitle}</strong>
                      <span>{candidate.showDate} {candidate.showTime} · {candidate.screenName}</span>
                      <small>{candidate.rawText}</small>
                    </td>
                    <td>
                      <strong>{candidate.theaterName}</strong>
                      <span>{candidate.sourceId}</span>
                    </td>
                    <td>
                      <strong>{candidate.seatAvailable}/{candidate.seatTotal}</strong>
                      <span>{candidate.price.toLocaleString()}원</span>
                    </td>
                    <td>
                      <Confidence value={candidate.confidence} />
                      {candidate.warnings.length > 0 && (
                        <ul className={styles.warnings}>
                          {candidate.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                        </ul>
                      )}
                    </td>
                    <td><StatusBadge status={candidate.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payload.candidates.length === 0 && (
              <div className={styles.empty}>
                수집 실행을 누르면 샘플 크롤링 결과가 이곳에 표시됩니다.
              </div>
            )}
          </div>
        </section>
      </section>

      <section className={styles.runLog}>
        <div className={styles.panelHeader}>
          <h2>최근 수집 로그</h2>
          <span>{latestRun ? latestRun.finishedAt : '아직 실행 전'}</span>
        </div>
        <div className={styles.logGrid}>
          {payload.runs.slice(0, 5).map((run) => (
            <article key={run.id} className={styles.logItem}>
              <strong>{run.sourceName}</strong>
              <span>{run.inputKind} · {run.status} · 후보 {run.createdCount}개 · 경고 {run.warningCount}개</span>
            </article>
          ))}
          {payload.runs.length === 0 && <p className={styles.emptyLog}>크롤링 이력이 없습니다.</p>}
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'warning' | 'success' }) {
  const toneClass = tone === 'default' ? '' : styles[tone]

  return (
    <article className={`${styles.metric} ${toneClass}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function Confidence({ value }: { value: number }) {
  const percent = Math.round(value * 100)

  return (
    <div className={styles.confidence}>
      <span>{percent}%</span>
      <div><i style={{ width: `${percent}%` }} /></div>
    </div>
  )
}

function StatusBadge({ status }: { status: AdminShowtimeStatus }) {
  const label = {
    draft: '초안',
    needs_review: '검수',
    approved: '승인',
    rejected: '반려',
  }[status]

  return <span className={`${styles.status} ${styles[status]}`}>{label}</span>
}
