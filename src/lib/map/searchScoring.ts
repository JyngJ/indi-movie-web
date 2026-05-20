import type { Movie, Station, Theater } from '@/types/api'
import { normalizeSearchText, fuzzyScore } from './searchUtils'

export function stationSearchScore(station: Station, query: string): number {
  const nq = normalizeSearchText(query)
  if (!nq) return 0
  let best = 0
  for (const name of [station.name, ...station.aliases].map(normalizeSearchText)) {
    if (name === nq) best = Math.max(best, 100)
    else if (name.startsWith(nq)) best = Math.max(best, 80)
    else if (name.includes(nq)) best = Math.max(best, 60)
    else best = Math.max(best, fuzzyScore(name, nq))
  }
  return best
}

export function movieSearchScore(movie: Movie, query: string): number {
  const nq = normalizeSearchText(query)
  if (!nq) return 0
  let best = 0
  for (const title of [movie.title, movie.originalTitle ?? ''].map(normalizeSearchText).filter(Boolean)) {
    if (title === nq) best = Math.max(best, 100)
    else if (title.startsWith(nq)) best = Math.max(best, 80)
    else if (title.includes(nq)) best = Math.max(best, 60)
    else best = Math.max(best, fuzzyScore(title, nq))
  }
  return best
}

export function directorSearchScore(director: string, query: string): number {
  const nq = normalizeSearchText(query)
  const nd = normalizeSearchText(director)
  if (!nq || !nd) return 0
  if (nd === nq) return 100
  if (nd.startsWith(nq)) return 80
  if (nd.includes(nq)) return 60
  return fuzzyScore(nd, nq)
}

export function theaterSearchScore(theater: Theater, query: string): number {
  const nq = normalizeSearchText(query)
  if (!nq) return 0
  let best = 0
  for (const field of [theater.name, theater.address, theater.city ?? ''].map(normalizeSearchText).filter(Boolean)) {
    if (field === nq) best = Math.max(best, 100)
    else if (field.startsWith(nq)) best = Math.max(best, 82)
    else if (field.includes(nq)) best = Math.max(best, 58)
    else best = Math.max(best, fuzzyScore(field, nq))
  }
  return best
}

export function areaSearchScore(name: string, query: string): number {
  const nq = normalizeSearchText(query)
  const na = normalizeSearchText(name)
  if (!nq || !na) return 0
  if (na === nq) return 100
  if (na.startsWith(nq)) return 78
  if (na.includes(nq)) return 55
  return fuzzyScore(na, nq)
}
