'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/primitives'
import type {
  AdminExternalMovie,
  AdminMatchOptions,
  AdminMovie,
  AdminMovieInput,
  AdminServiceShowtime,
  AdminShowtimeStatus,
  AdminShowtimeInput,
  AdminTheater,
  AdminTheaterInput,
  AdminTheaterSource,
  CandidateMatchPayload,
  CrawledShowtimeCandidate,
  CrawlInputKind,
  CrawlRun,
  ShowtimeApprovalResult,
} from '@/types/admin'
import styles from './admin.module.css'

interface AdminPayload {
  sources: AdminTheaterSource[]
  runs: CrawlRun[]
  candidates: CrawledShowtimeCandidate[]
  matchOptions: AdminMatchOptions
}

const emptyPayload: AdminPayload = {
  sources: [],
  runs: [],
  candidates: [],
  matchOptions: {
    theaters: [],
    movies: [],
  },
}

const inputKinds: Array<{ value: CrawlInputKind; label: string }> = [
  { value: 'fixture', label: '샘플 HTML' },
  { value: 'url', label: 'URL 크롤링' },
  { value: 'html', label: 'HTML 붙여넣기' },
  { value: 'csv', label: 'CSV 업로드' },
]

export function AdminShowtimeConsole() {
  const router = useRouter()
  const [payload, setPayload] = useState<AdminPayload>(emptyPayload)
  const [adminTheaters, setAdminTheaters] = useState<AdminTheater[]>([])
  const [adminMovies, setAdminMovies] = useState<AdminMovie[]>([])
  const [serviceShowtimes, setServiceShowtimes] = useState<AdminServiceShowtime[]>([])
  const [selectedAdminTheaterId, setSelectedAdminTheaterId] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [inputKind, setInputKind] = useState<CrawlInputKind>('fixture')
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [matchDrafts, setMatchDrafts] = useState<Record<string, CandidateMatchPayload>>({})
  const [movieFormOpen, setMovieFormOpen] = useState(false)
  const [movieSearchQuery, setMovieSearchQuery] = useState('')
  const [movieSearchResults, setMovieSearchResults] = useState<AdminExternalMovie[]>([])
  const [movieEditForm, setMovieEditForm] = useState<AdminMovieInput | null>(null)
  const [theaterFormOpen, setTheaterFormOpen] = useState(false)
  const [theaterForm, setTheaterForm] = useState<AdminTheaterInput>({
    name: '',
    lat: 0,
    lng: 0,
    address: '',
    city: '',
    phone: '',
    website: '',
    screenCount: 0,
    seatCount: undefined,
  })
  const [showtimeDrafts, setShowtimeDrafts] = useState<Record<string, AdminShowtimeInput>>({})
  const [sourceFormOpen, setSourceFormOpen] = useState(false)
  const [sourceForm, setSourceForm] = useState({
    theaterName: '',
    matchedTheaterId: '',
    homepageUrl: '',
    listingUrl: '',
    parser: 'tableText',
    cadence: 'manual',
    notes: '',
  })

  useEffect(() => {
    refresh()
    refreshAdminTheaters()
    refreshAdminMovies()
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
  const matchedCount = payload.candidates.filter((candidate) => candidate.matchedTheaterId && candidate.matchedMovieId).length
  const candidateIds = useMemo(() => payload.candidates.map((candidate) => candidate.id), [payload.candidates])
  const selectedCandidateCount = candidateIds.filter((id) => selectedIds.includes(id)).length
  const allCandidatesSelected = candidateIds.length > 0 && selectedCandidateCount === candidateIds.length
  const someCandidatesSelected = selectedCandidateCount > 0 && selectedCandidateCount < candidateIds.length
  const selectedAdminTheater = adminTheaters.find((theater) => theater.id === selectedAdminTheaterId)
  const averageConfidence = useMemo(() => {
    if (!payload.candidates.length) return 0
    const total = payload.candidates.reduce((sum, candidate) => sum + candidate.confidence, 0)
    return Math.round((total / payload.candidates.length) * 100)
  }, [payload.candidates])

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someCandidatesSelected
    }
  }, [someCandidatesSelected])

  async function refresh() {
    const response = await fetch('/api/admin/showtimes', { cache: 'no-store' })
    if (response.status === 401 || response.status === 403) {
      router.replace('/admin/login')
      return
    }

    const next = (await response.json()) as AdminPayload
    setPayload(next)
  }

  async function refreshAdminTheaters() {
    const response = await fetch('/api/admin/theaters', { cache: 'no-store' })
    if (response.status === 401 || response.status === 403) {
      router.replace('/admin/login')
      return
    }

    const next = (await response.json()) as { theaters?: AdminTheater[]; error?: { message: string } }
    if (!response.ok || !next.theaters) {
      setMessage(next.error?.message ?? '극장 목록을 불러오지 못했습니다.')
      return
    }

    setAdminTheaters(next.theaters)
    if (!selectedAdminTheaterId && next.theaters[0]) {
      setSelectedAdminTheaterId(next.theaters[0].id)
      fetchServiceShowtimes(next.theaters[0].id)
    }
  }

  async function refreshAdminMovies() {
    const response = await fetch('/api/admin/movies', { cache: 'no-store' })
    const next = (await response.json()) as { movies?: AdminMovie[]; error?: { message: string } }
    if (!response.ok || !next.movies) {
      setMessage(next.error?.message ?? '영화 목록을 불러오지 못했습니다.')
      return
    }

    setAdminMovies(next.movies)
  }

  async function fetchServiceShowtimes(theaterId: string) {
    if (!theaterId) {
      setServiceShowtimes([])
      return
    }

    const response = await fetch(`/api/admin/theaters/${theaterId}/showtimes`, { cache: 'no-store' })
    const next = (await response.json()) as { showtimes?: AdminServiceShowtime[]; error?: { message: string } }
    if (!response.ok || !next.showtimes) {
      setMessage(next.error?.message ?? '극장별 시간표를 불러오지 못했습니다.')
      return
    }

    setServiceShowtimes(next.showtimes)
    setShowtimeDrafts({})
  }

  async function signOut() {
    await fetch('/api/admin/session', { method: 'DELETE' })
    router.replace('/admin/login')
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
      if (status === 'approved') {
        const response = await fetch('/api/admin/showtimes/approve', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds }),
        })
        const result = (await response.json()) as ShowtimeApprovalResult | { error?: { message: string } }

        if (!response.ok && 'error' in result) {
          throw new Error(result.error?.message ?? '승인 업로드에 실패했습니다.')
        }

        if ('approved' in result) {
          const failedMessage = result.failed.length > 0
            ? ` 실패 ${result.failed.length}건: ${result.failed.slice(0, 2).map((item) => item.reason).join(', ')}`
            : ''
          setMessage(`상영시간표 ${result.approved.length}건을 업로드했습니다.${failedMessage}`)
        }
      } else {
        const response = await fetch('/api/admin/showtimes', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, status }),
        })

        if (!response.ok) {
          const result = (await response.json()) as { error?: { message: string } }
          throw new Error(result.error?.message ?? '상태 변경에 실패했습니다.')
        }

        setMessage('선택한 회차 상태를 변경했습니다.')
      }

      await refresh()
      setSelectedIds([])
      if (status !== 'approved') setMessage('선택한 회차 상태를 변경했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '상태 변경에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function autoMatchCandidates() {
    const ids = selectedIds.length > 0 ? selectedIds : undefined
    setLoading(true)
    setMessage(ids ? '선택한 후보를 자동 매칭하는 중입니다.' : '검수 대기 후보를 자동 매칭하는 중입니다.')

    try {
      const response = await fetch('/api/admin/showtimes/auto-match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const result = (await response.json()) as {
        matched?: number
        needsReview?: number
        updated?: CrawledShowtimeCandidate[]
        error?: { message: string }
      }

      if (!response.ok || !result.updated) {
        throw new Error(result.error?.message ?? '자동 매칭에 실패했습니다.')
      }

      setPayload((current) => ({
        ...current,
        candidates: current.candidates.map((candidate) =>
          result.updated?.find((updated) => updated.id === candidate.id) ?? candidate,
        ),
      }))
      setMessage(`자동 매칭 완료: 성공 ${result.matched ?? 0}건, 확인 필요 ${result.needsReview ?? 0}건`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '자동 매칭에 실패했습니다.')
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
        matchedTheaterId: '',
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

  async function deleteSource() {
    if (!selectedSource) {
      setMessage('삭제할 크롤링 소스를 먼저 선택하세요.')
      return
    }

    const confirmed = window.confirm(`${selectedSource.theaterName} 크롤링 소스와 관련 후보/실행 로그를 삭제할까요?`)
    if (!confirmed) return

    setLoading(true)
    setMessage('크롤링 소스를 삭제하는 중입니다.')

    try {
      const response = await fetch(`/api/admin/sources?id=${encodeURIComponent(selectedSource.id)}`, {
        method: 'DELETE',
      })
      const result = (await response.json()) as { deleted?: { id: string }; error?: { message: string } }

      if (!response.ok || !result.deleted) {
        throw new Error(result.error?.message ?? '크롤링 소스를 삭제하지 못했습니다.')
      }

      setSelectedSourceId('')
      setUrl('')
      setSelectedIds([])
      await refresh()
      setMessage(`${selectedSource.theaterName} 크롤링 소스를 삭제했습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '크롤링 소스를 삭제하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function saveCandidateMatch(candidateId: string) {
    const draft = matchDrafts[candidateId]
    const candidate = payload.candidates.find((item) => item.id === candidateId)

    if (!draft || !candidate) {
      setMessage('저장할 매칭 변경사항이 없습니다.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/showtimes/matches', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          matchedTheaterId: draft.matchedTheaterId || undefined,
          matchedMovieId: draft.matchedMovieId || undefined,
        }),
      })
      const result = (await response.json()) as { candidate?: CrawledShowtimeCandidate; error?: { message: string } }

      if (!response.ok || !result.candidate) {
        throw new Error(result.error?.message ?? '매칭을 저장하지 못했습니다.')
      }

      setPayload((current) => ({
        ...current,
        candidates: current.candidates.map((item) => (item.id === candidateId ? result.candidate as CrawledShowtimeCandidate : item)),
      }))
      setMatchDrafts((current) => {
        const next = { ...current }
        delete next[candidateId]
        return next
      })
      setMessage(`${candidate.movieTitle} 매칭을 저장했습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '매칭을 저장하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function searchMovies() {
    if (movieSearchQuery.trim().length < 2) {
      setMessage('KMDB 검색어는 2자 이상 입력하세요.')
      return
    }

    setLoading(true)
    setMessage('KMDB에서 영화를 검색하는 중입니다.')

    try {
      const response = await fetch(`/api/admin/movies/search?q=${encodeURIComponent(movieSearchQuery)}`, {
        cache: 'no-store',
      })
      const result = (await response.json()) as {
        movies?: AdminExternalMovie[]
        error?: { message: string }
      }

      if (!response.ok || !result.movies) {
        throw new Error(result.error?.message ?? 'KMDB 영화 검색에 실패했습니다.')
      }

      setMovieSearchResults(result.movies)
      setMessage(`KMDB 검색 결과 ${result.movies.length}건을 불러왔습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'KMDB 영화 검색에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function importMovieFromKmdb(movie: AdminExternalMovie) {
    setLoading(true)
    setMessage(`${movie.title} 정보를 KMDB에서 가져오는 중입니다.`)

    try {
      const response = await fetch('/api/admin/movies/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kmdbMovieId: movie.movieId, kmdbMovieSeq: movie.movieSeq }),
      })
      const result = (await response.json()) as {
        movie?: AdminMatchOptions['movies'][number]
        error?: { message: string }
      }

      if (!response.ok || !result.movie) {
        throw new Error(result.error?.message ?? '영화 후보를 생성하지 못했습니다.')
      }

      const importedMovie = result.movie
      setPayload((current) => ({
        ...current,
        matchOptions: {
          ...current.matchOptions,
          movies: upsertOption(current.matchOptions.movies, importedMovie).sort((a, b) => a.label.localeCompare(b.label)),
        },
      }))
      await refreshAdminMovies()
      setMessage(`${importedMovie.label} 영화를 추가했습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'KMDB 영화를 가져오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function saveTheater() {
    setLoading(true)
    setMessage(theaterForm.id ? '극장을 수정하는 중입니다.' : '극장을 생성하는 중입니다.')

    try {
      const response = await fetch('/api/admin/theaters', {
        method: theaterForm.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(theaterForm),
      })
      const result = (await response.json()) as { theater?: AdminTheater; error?: { message: string } }

      if (!response.ok || !result.theater) {
        throw new Error(result.error?.message ?? '극장을 저장하지 못했습니다.')
      }

      await Promise.all([refreshAdminTheaters(), refresh()])
      setSelectedAdminTheaterId(result.theater.id)
      await fetchServiceShowtimes(result.theater.id)
      resetTheaterForm()
      setTheaterFormOpen(false)
      setMessage(`${result.theater.name} 극장을 저장했습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '극장을 저장하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function saveServiceShowtime(showtimeId: string) {
    const draft = showtimeDrafts[showtimeId]
    if (!draft) {
      setMessage('저장할 상영시간표 변경사항이 없습니다.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/theaters/${draft.theaterId}/showtimes`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const result = (await response.json()) as { showtime?: AdminServiceShowtime; error?: { message: string } }

      if (!response.ok || !result.showtime) {
        throw new Error(result.error?.message ?? '상영시간표를 수정하지 못했습니다.')
      }

      setServiceShowtimes((current) => current.map((item) => (item.id === showtimeId ? result.showtime as AdminServiceShowtime : item)))
      setShowtimeDrafts((current) => {
        const next = { ...current }
        delete next[showtimeId]
        return next
      })
      setMessage(`${result.showtime.movieTitle} 시간표를 수정했습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '상영시간표를 수정하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function saveMovie() {
    if (!movieEditForm) {
      setMessage('수정할 영화를 먼저 선택하세요.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/movies', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(movieEditForm),
      })
      const result = (await response.json()) as { movie?: AdminMovie; error?: { message: string } }

      if (!response.ok || !result.movie) {
        throw new Error(result.error?.message ?? '영화를 수정하지 못했습니다.')
      }

      setAdminMovies((current) => current.map((movie) => (movie.id === result.movie?.id ? result.movie : movie)))
      setPayload((current) => ({
        ...current,
        matchOptions: {
          ...current.matchOptions,
          movies: current.matchOptions.movies.map((movie) =>
            movie.id === result.movie?.id
              ? { id: result.movie.id, label: result.movie.title, description: String(result.movie.year) }
              : movie,
          ),
        },
      }))
      setMovieEditForm(null)
      setMessage(`${result.movie.title} 영화를 수정했습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '영화를 수정하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function updateMatchDraft(candidateId: string, key: 'matchedTheaterId' | 'matchedMovieId', value: string) {
    const candidate = payload.candidates.find((item) => item.id === candidateId)
    setMatchDrafts((current) => ({
      ...current,
      [candidateId]: {
        candidateId,
        matchedTheaterId: current[candidateId]?.matchedTheaterId ?? candidate?.matchedTheaterId,
        matchedMovieId: current[candidateId]?.matchedMovieId ?? candidate?.matchedMovieId,
        [key]: value || undefined,
      },
    }))
  }

  function editTheater(theater: AdminTheater) {
    setTheaterFormOpen(true)
    setTheaterForm({
      id: theater.id,
      name: theater.name,
      lat: theater.lat,
      lng: theater.lng,
      address: theater.address,
      city: theater.city,
      phone: theater.phone ?? '',
      website: theater.website ?? '',
      screenCount: theater.screenCount,
      seatCount: theater.seatCount,
    })
  }

  function resetTheaterForm() {
    setTheaterForm({
      name: '',
      lat: 0,
      lng: 0,
      address: '',
      city: '',
      phone: '',
      website: '',
      screenCount: 0,
      seatCount: undefined,
    })
  }

  function selectAdminTheater(theaterId: string) {
    setSelectedAdminTheaterId(theaterId)
    fetchServiceShowtimes(theaterId)
  }

  function updateShowtimeDraft<K extends keyof AdminShowtimeInput>(
    showtime: AdminServiceShowtime,
    key: K,
    value: AdminShowtimeInput[K],
  ) {
    setShowtimeDrafts((current) => ({
      ...current,
      [showtime.id]: {
        id: showtime.id,
        theaterId: current[showtime.id]?.theaterId ?? showtime.theaterId,
        movieId: current[showtime.id]?.movieId ?? showtime.movieId,
        screenName: current[showtime.id]?.screenName ?? showtime.screenName,
        showDate: current[showtime.id]?.showDate ?? showtime.showDate,
        showTime: current[showtime.id]?.showTime ?? showtime.showTime,
        endTime: current[showtime.id]?.endTime ?? showtime.endTime,
        formatType: current[showtime.id]?.formatType ?? showtime.formatType,
        language: current[showtime.id]?.language ?? showtime.language,
        seatAvailable: current[showtime.id]?.seatAvailable ?? showtime.seatAvailable,
        seatTotal: current[showtime.id]?.seatTotal ?? showtime.seatTotal,
        price: current[showtime.id]?.price ?? showtime.price,
        bookingUrl: current[showtime.id]?.bookingUrl ?? showtime.bookingUrl,
        isActive: current[showtime.id]?.isActive ?? showtime.isActive,
        [key]: value,
      },
    }))
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    )
  }

  function toggleAllCandidates() {
    setSelectedIds((current) => {
      const visibleIds = new Set(candidateIds)
      const hiddenIds = current.filter((id) => !visibleIds.has(id))
      return allCandidatesSelected ? hiddenIds : [...hiddenIds, ...candidateIds]
    })
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
          <Button variant="ghost" size="sm" onClick={signOut}>로그아웃</Button>
          <Button variant="ghost" size="sm" onClick={refresh}>새로고침</Button>
          <Button size="sm" loading={loading} onClick={runCrawler}>수집 실행</Button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="상영시간표 운영 지표">
        <Metric label="수집 후보" value={payload.candidates.length} />
        <Metric label="검수 필요" value={reviewCount} tone={reviewCount ? 'warning' : 'default'} />
        <Metric label="승인 완료" value={approvedCount} tone="success" />
        <Metric label="매칭 완료" value={matchedCount} tone={matchedCount ? 'success' : 'default'} />
        <Metric label="평균 신뢰도" value={`${averageConfidence}%`} />
      </section>

      <section className={styles.workspace}>
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>크롤링 소스</h2>
            <div className={styles.sourceHeaderActions}>
              <button className={styles.linkButton} onClick={() => setSourceFormOpen((open) => !open)}>
                {sourceFormOpen ? '닫기' : '새 소스'}
              </button>
              <button className={styles.dangerLinkButton} disabled={!selectedSource || loading} onClick={deleteSource}>
                삭제
              </button>
            </div>
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
                실제 극장
                <select
                  value={sourceForm.matchedTheaterId}
                  onChange={(event) => {
                    const theater = adminTheaters.find((item) => item.id === event.target.value)
                    setSourceForm((current) => ({
                      ...current,
                      matchedTheaterId: event.target.value,
                      theaterName: theater?.name ?? current.theaterName,
                      homepageUrl: theater?.website ?? current.homepageUrl,
                    }))
                  }}
                >
                  <option value="">선택 안 함</option>
                  {adminTheaters.map((theater) => (
                    <option key={theater.id} value={theater.id}>
                      {theater.name} · {theater.city}
                    </option>
                  ))}
                </select>
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
                    <option value="dtryxReservationApi">디트릭스 예매 API</option>
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
                  <small>{source.parser} · {source.cadence}{source.matchedTheaterId ? ' · 실제 극장 연결' : ''}</small>
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
              <button className={styles.linkButton} onClick={() => setMovieFormOpen((open) => !open)}>
                {movieFormOpen ? 'KMDB 닫기' : 'KMDB 영화'}
              </button>
              <Button variant="secondary" size="sm" loading={loading} onClick={autoMatchCandidates}>자동 매칭</Button>
              <Button variant="secondary" size="sm" onClick={() => updateStatus('needs_review')}>재검수</Button>
              <Button variant="ghost" size="sm" onClick={() => updateStatus('rejected')}>반려</Button>
              <Button size="sm" onClick={() => updateStatus('approved')}>승인</Button>
            </div>
          </div>

          {message && <p className={styles.message}>{message}</p>}

          {movieFormOpen && (
            <div className={styles.movieSearchBox}>
              <div className={styles.inlineForm}>
                <label>
                  KMDB 영화 검색
                  <input
                    value={movieSearchQuery}
                    onChange={(event) => setMovieSearchQuery(event.target.value)}
                    placeholder="후보 제목 또는 영화명"
                  />
                </label>
                <Button size="sm" loading={loading} onClick={searchMovies}>검색</Button>
              </div>
              {movieSearchResults.length > 0 && (
                <div className={styles.movieResults}>
                  {movieSearchResults.map((movie) => (
                    <article key={movie.externalId} className={styles.movieResultItem}>
                      <span>
                        <strong>{movie.title}</strong>
                        <small>
                          KMDB {movie.movieId}{movie.movieSeq} · {movie.year}
                          {movie.openDate ? ` · ${movie.openDate}` : ''}
                          {movie.director.length ? ` · ${movie.director.join(', ')}` : ''}
                          {movie.posterUrl ? ' · 포스터 있음' : ''}
                        </small>
                      </span>
                      <Button variant="secondary" size="sm" loading={loading} onClick={() => importMovieFromKmdb(movie)}>
                        가져오기
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-label="전체 선택">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allCandidatesSelected}
                      disabled={candidateIds.length === 0}
                      aria-label="검수 대기열 전체 선택"
                      onChange={toggleAllCandidates}
                    />
                  </th>
                  <th>상영 정보</th>
                  <th>극장</th>
                  <th>매칭</th>
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
                      <div className={styles.matchControls}>
                        <label>
                          극장
                          <select
                            value={matchDrafts[candidate.id]?.matchedTheaterId ?? candidate.matchedTheaterId ?? ''}
                            onChange={(event) => updateMatchDraft(candidate.id, 'matchedTheaterId', event.target.value)}
                          >
                            <option value="">자동 매칭</option>
                            {payload.matchOptions.theaters.map((theater) => (
                              <option key={theater.id} value={theater.id}>
                                {theater.label}{theater.description ? ` · ${theater.description}` : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          영화
                          <select
                            value={matchDrafts[candidate.id]?.matchedMovieId ?? candidate.matchedMovieId ?? ''}
                            onChange={(event) => updateMatchDraft(candidate.id, 'matchedMovieId', event.target.value)}
                          >
                            <option value="">자동 매칭</option>
                            {payload.matchOptions.movies.map((movie) => (
                              <option key={movie.id} value={movie.id}>
                                {movie.label}{movie.description ? ` · ${movie.description}` : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!matchDrafts[candidate.id]}
                          loading={loading && Boolean(matchDrafts[candidate.id])}
                          onClick={() => saveCandidateMatch(candidate.id)}
                        >
                          저장
                        </Button>
                      </div>
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

      <section className={styles.servicePanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>실제 서비스 DB</h2>
            <span>극장 데이터와 승인된 극장별 상영시간표를 관리합니다.</span>
          </div>
          <button
            className={styles.linkButton}
            onClick={() => {
              if (!theaterFormOpen) resetTheaterForm()
              setTheaterFormOpen((open) => !open)
            }}
          >
            {theaterFormOpen ? '극장 폼 닫기' : '새 극장'}
          </button>
        </div>

        {theaterFormOpen && (
          <div className={styles.theaterForm}>
            <label>
              극장명
              <input value={theaterForm.name} onChange={(event) => setTheaterForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              도시
              <input value={theaterForm.city} onChange={(event) => setTheaterForm((current) => ({ ...current, city: event.target.value }))} />
            </label>
            <label>
              위도
              <input type="number" step="0.000001" value={theaterForm.lat} onChange={(event) => setTheaterForm((current) => ({ ...current, lat: Number(event.target.value) }))} />
            </label>
            <label>
              경도
              <input type="number" step="0.000001" value={theaterForm.lng} onChange={(event) => setTheaterForm((current) => ({ ...current, lng: Number(event.target.value) }))} />
            </label>
            <label className={styles.wideField}>
              주소
              <input value={theaterForm.address} onChange={(event) => setTheaterForm((current) => ({ ...current, address: event.target.value }))} />
            </label>
            <label>
              전화
              <input value={theaterForm.phone ?? ''} onChange={(event) => setTheaterForm((current) => ({ ...current, phone: event.target.value }))} />
            </label>
            <label>
              웹사이트
              <input value={theaterForm.website ?? ''} onChange={(event) => setTheaterForm((current) => ({ ...current, website: event.target.value }))} />
            </label>
            <label>
              상영관 수
              <input type="number" min={0} value={theaterForm.screenCount ?? 0} onChange={(event) => setTheaterForm((current) => ({ ...current, screenCount: Number(event.target.value) }))} />
            </label>
            <label>
              좌석 수
              <input type="number" min={0} value={theaterForm.seatCount ?? ''} onChange={(event) => setTheaterForm((current) => ({ ...current, seatCount: event.target.value ? Number(event.target.value) : undefined }))} />
            </label>
            <Button size="sm" loading={loading} onClick={saveTheater}>{theaterForm.id ? '극장 수정' : '극장 생성'}</Button>
          </div>
        )}

        <div className={styles.serviceGrid}>
          <aside className={styles.serviceList}>
            {adminTheaters.map((theater) => (
              <button
                key={theater.id}
                className={`${styles.sourceItem} ${selectedAdminTheaterId === theater.id ? styles.sourceItemActive : ''}`}
                onClick={() => selectAdminTheater(theater.id)}
              >
                <span>
                  <strong>{theater.name}</strong>
                  <small>{theater.city} · {theater.address}</small>
                </span>
              </button>
            ))}
            {adminTheaters.length === 0 && <p className={styles.emptyLog}>등록된 실제 극장이 없습니다.</p>}
          </aside>

          <section className={styles.serviceDetail}>
            <div className={styles.serviceDetailHeader}>
              <div>
                <strong>{selectedAdminTheater?.name ?? '극장을 선택하세요'}</strong>
                <span>{selectedAdminTheater ? `${selectedAdminTheater.city} · ${selectedAdminTheater.address}` : '왼쪽 목록에서 실제 극장을 선택하면 시간표가 표시됩니다.'}</span>
              </div>
              {selectedAdminTheater && (
                <Button variant="secondary" size="sm" onClick={() => editTheater(selectedAdminTheater)}>극장 수정</Button>
              )}
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>영화</th>
                    <th>상영</th>
                    <th>좌석/가격</th>
                    <th>상태</th>
                    <th>저장</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceShowtimes.map((showtime) => {
                    const draft = showtimeDrafts[showtime.id]

                    return (
                      <tr key={showtime.id}>
                        <td>
                          <select
                            value={draft?.movieId ?? showtime.movieId}
                            onChange={(event) => updateShowtimeDraft(showtime, 'movieId', event.target.value)}
                          >
                            {payload.matchOptions.movies.map((movie) => (
                              <option key={movie.id} value={movie.id}>
                                {movie.label}{movie.description ? ` · ${movie.description}` : ''}
                              </option>
                            ))}
                          </select>
                          <small>{showtime.movieTitle}</small>
                        </td>
                        <td>
                          <div className={styles.showtimeEditGrid}>
                            <input type="date" value={draft?.showDate ?? showtime.showDate} onChange={(event) => updateShowtimeDraft(showtime, 'showDate', event.target.value)} />
                            <input type="time" value={draft?.showTime ?? showtime.showTime} onChange={(event) => updateShowtimeDraft(showtime, 'showTime', event.target.value)} />
                            <input type="time" value={draft?.endTime ?? showtime.endTime ?? ''} onChange={(event) => updateShowtimeDraft(showtime, 'endTime', event.target.value)} />
                            <input value={draft?.screenName ?? showtime.screenName} onChange={(event) => updateShowtimeDraft(showtime, 'screenName', event.target.value)} />
                          </div>
                        </td>
                        <td>
                          <div className={styles.showtimeEditGrid}>
                            <input type="number" min={0} value={draft?.seatAvailable ?? showtime.seatAvailable} onChange={(event) => updateShowtimeDraft(showtime, 'seatAvailable', Number(event.target.value))} />
                            <input type="number" min={0} value={draft?.seatTotal ?? showtime.seatTotal} onChange={(event) => updateShowtimeDraft(showtime, 'seatTotal', Number(event.target.value))} />
                            <input type="number" min={0} value={draft?.price ?? showtime.price} onChange={(event) => updateShowtimeDraft(showtime, 'price', Number(event.target.value))} />
                          </div>
                        </td>
                        <td>
                          <label className={styles.checkLabel}>
                            <input
                              type="checkbox"
                              checked={draft?.isActive ?? showtime.isActive}
                              onChange={(event) => updateShowtimeDraft(showtime, 'isActive', event.target.checked)}
                            />
                            노출
                          </label>
                        </td>
                        <td>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!draft}
                            loading={loading && Boolean(draft)}
                            onClick={() => saveServiceShowtime(showtime.id)}
                          >
                            저장
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {selectedAdminTheater && serviceShowtimes.length === 0 && (
                <div className={styles.empty}>이 극장에 승인된 상영시간표가 없습니다.</div>
              )}
            </div>
          </section>
        </div>

        <section className={styles.movieAdminPanel}>
          <div className={styles.serviceDetailHeader}>
            <div>
              <strong>영화 DB</strong>
              <span>KMDB로 가져온 내부 영화 레코드를 조회하고 수정합니다.</span>
            </div>
            <Button variant="ghost" size="sm" onClick={refreshAdminMovies}>영화 새로고침</Button>
          </div>
          <div className={styles.movieAdminGrid}>
            <div className={styles.serviceList}>
              {adminMovies.map((movie) => (
                <button
                  key={movie.id}
                  className={`${styles.sourceItem} ${movieEditForm?.id === movie.id ? styles.sourceItemActive : ''}`}
                  onClick={() => setMovieEditForm({
                    id: movie.id,
                    title: movie.title,
                    year: movie.year,
                    originalTitle: movie.originalTitle ?? '',
                    genre: movie.genre,
                    director: movie.director,
                    kmdbId: movie.kmdbId,
                    kmdbMovieSeq: movie.kmdbMovieSeq,
                    posterUrl: movie.posterUrl,
                    synopsis: movie.synopsis,
                    runtimeMinutes: movie.runtimeMinutes,
                    certification: movie.certification,
                  })}
                >
                  <span>
                    <strong>{movie.title}</strong>
                    <small>{movie.year} · {movie.director.join(', ') || '감독 미입력'}{movie.kmdbId ? ` · KMDB ${movie.kmdbId}${movie.kmdbMovieSeq ?? ''}` : ''}{movie.posterUrl ? ' · 포스터 있음' : ''}</small>
                  </span>
                </button>
              ))}
              {adminMovies.length === 0 && <p className={styles.emptyLog}>등록된 영화가 없습니다.</p>}
            </div>

            {movieEditForm && (
              <div className={styles.movieEditForm}>
                <label>
                  제목
                  <input value={movieEditForm.title} onChange={(event) => setMovieEditForm((current) => current ? { ...current, title: event.target.value } : current)} />
                </label>
                <label>
                  연도
                  <input type="number" min={1888} max={2100} value={movieEditForm.year} onChange={(event) => setMovieEditForm((current) => current ? { ...current, year: Number(event.target.value) } : current)} />
                </label>
                <label>
                  원제
                  <input value={movieEditForm.originalTitle ?? ''} onChange={(event) => setMovieEditForm((current) => current ? { ...current, originalTitle: event.target.value } : current)} />
                </label>
                <label>
                  KMDB ID
                  <input value={movieEditForm.kmdbId ?? ''} onChange={(event) => setMovieEditForm((current) => current ? { ...current, kmdbId: event.target.value } : current)} />
                </label>
                <label>
                  KMDB Seq
                  <input value={movieEditForm.kmdbMovieSeq ?? ''} onChange={(event) => setMovieEditForm((current) => current ? { ...current, kmdbMovieSeq: event.target.value } : current)} />
                </label>
                <label>
                  포스터 URL
                  <input value={movieEditForm.posterUrl ?? ''} onChange={(event) => setMovieEditForm((current) => current ? { ...current, posterUrl: event.target.value } : current)} />
                </label>
                <label>
                  관람등급
                  <input value={movieEditForm.certification ?? ''} onChange={(event) => setMovieEditForm((current) => current ? { ...current, certification: event.target.value } : current)} />
                </label>
                <label>
                  러닝타임
                  <input type="number" min={0} value={movieEditForm.runtimeMinutes ?? ''} onChange={(event) => setMovieEditForm((current) => current ? { ...current, runtimeMinutes: event.target.value ? Number(event.target.value) : undefined } : current)} />
                </label>
                <label>
                  장르
                  <input value={(movieEditForm.genre ?? []).join(', ')} onChange={(event) => setMovieEditForm((current) => current ? { ...current, genre: splitListInput(event.target.value) } : current)} />
                </label>
                <label>
                  감독
                  <input value={(movieEditForm.director ?? []).join(', ')} onChange={(event) => setMovieEditForm((current) => current ? { ...current, director: splitListInput(event.target.value) } : current)} />
                </label>
                <label className={styles.wideField}>
                  줄거리
                  <textarea value={movieEditForm.synopsis ?? ''} onChange={(event) => setMovieEditForm((current) => current ? { ...current, synopsis: event.target.value } : current)} />
                </label>
                <Button size="sm" loading={loading} onClick={saveMovie}>영화 수정</Button>
              </div>
            )}
          </div>
        </section>
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

function upsertOption<T extends { id: string }>(options: T[], option: T) {
  return options.some((item) => item.id === option.id)
    ? options.map((item) => (item.id === option.id ? option : item))
    : [...options, option]
}

function splitListInput(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}
