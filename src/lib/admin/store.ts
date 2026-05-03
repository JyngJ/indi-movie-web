import type {
  AdminTheaterSource,
  AdminTheaterSourceInput,
  AdminShowtimeStatus,
  CrawledShowtimeCandidate,
  CrawlRun,
} from '@/types/admin'
import { ADMIN_THEATER_SOURCES } from './sources'

const sources = new Map<string, AdminTheaterSource>(
  ADMIN_THEATER_SOURCES.map((source) => [source.id, source]),
)
const runs = new Map<string, CrawlRun>()
const candidates = new Map<string, CrawledShowtimeCandidate>()

export function listAdminSources() {
  return Array.from(sources.values()).map((source) => ({
    ...source,
    lastCrawledAt: latestRunForSource(source.id)?.finishedAt ?? source.lastCrawledAt,
  }))
}

export function getAdminSource(sourceId: string) {
  return sources.get(sourceId)
}

export function createAdminSource(input: AdminTheaterSourceInput) {
  const theaterName = input.theaterName.trim()
  const listingUrl = input.listingUrl.trim()
  const homepageUrl = input.homepageUrl.trim() || originFromUrl(listingUrl)

  if (!theaterName || !listingUrl) {
    throw new Error('극장명과 상영시간표 URL은 필수입니다.')
  }

  const source: AdminTheaterSource = {
    id: uniqueSourceId(theaterName),
    theaterId: slugify(theaterName),
    theaterName,
    homepageUrl,
    listingUrl,
    parser: input.parser,
    enabled: true,
    cadence: input.cadence,
    health: 'healthy',
    notes: input.notes?.trim(),
  }

  sources.set(source.id, source)

  return source
}

export function saveCrawlRun(run: CrawlRun) {
  runs.set(run.id, run)
  run.candidates.forEach((candidate) => {
    candidates.set(candidate.id, candidate)
  })
  return run
}

export function listCrawlRuns() {
  return Array.from(runs.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export function listReviewCandidates(status?: AdminShowtimeStatus) {
  const items = Array.from(candidates.values())
  const filtered = status ? items.filter((candidate) => candidate.status === status) : items

  return filtered.sort((a, b) => {
    const statusOrder = scoreStatus(a.status) - scoreStatus(b.status)
    if (statusOrder !== 0) return statusOrder
    return `${a.showDate} ${a.showTime}`.localeCompare(`${b.showDate} ${b.showTime}`)
  })
}

export function updateCandidateStatuses(ids: string[], status: AdminShowtimeStatus) {
  const updated: CrawledShowtimeCandidate[] = []

  ids.forEach((id) => {
    const current = candidates.get(id)
    if (!current) return

    const next = { ...current, status }
    candidates.set(id, next)
    updated.push(next)
  })

  return updated
}

function latestRunForSource(sourceId: string) {
  return listCrawlRuns().find((run) => run.sourceId === sourceId)
}

function scoreStatus(status: AdminShowtimeStatus) {
  if (status === 'needs_review') return 0
  if (status === 'draft') return 1
  if (status === 'approved') return 2
  return 3
}

function uniqueSourceId(theaterName: string) {
  const base = `${slugify(theaterName)}-homepage`
  let id = base
  let suffix = 2

  while (sources.has(id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }

  return id
}

function slugify(value: string) {
  const romanized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return romanized || `source-${Date.now().toString(36)}`
}

function originFromUrl(value: string) {
  try {
    return new URL(value).origin
  } catch {
    return value
  }
}
