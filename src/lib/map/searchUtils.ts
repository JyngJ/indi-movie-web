export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function finiteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback
}

// Hangul 음절 ㅐ→ㅔ, ㅒ→ㅖ 정규화 (발음 동일 처리)
export function normalizeKoreanVowels(str: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0xAC00 || code > 0xD7A3) { result += str[i]; continue }
    const offset = code - 0xAC00
    const jong = offset % 28
    const jung = Math.floor(offset / 28) % 21
    const cho = Math.floor(offset / 588)
    const normJung = jung === 1 ? 5 : jung === 3 ? 7 : jung
    result += String.fromCharCode(0xAC00 + cho * 588 + normJung * 28 + jong)
  }
  return result
}

export function normalizeSearchText(value: string): string {
  return normalizeKoreanVowels(
    value.trim().toLowerCase().replace(/\s+/g, '').replace(/역$/g, '')
  )
}

// 서브시퀀스 퍼지 매칭: 쿼리 글자들이 타겟 안에 순서대로 등장하면 점수 반환
export function fuzzyScore(target: string, query: string): number {
  let qi = 0
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) qi++
  }
  return qi === query.length ? Math.max(10, Math.floor(35 * query.length / target.length)) : 0
}

const RECENT_KEY = 'movie:recent-searches:v1'

export function loadRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}

export function addToRecent(query: string, list: string[]): string[] {
  const q = query.trim()
  if (!q) return list
  const next = [q, ...list.filter(x => x !== q)].slice(0, 8)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
  return next
}

export function removeFromRecent(query: string, list: string[]): string[] {
  const next = list.filter(x => x !== query)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
  return next
}

/* ── 날짜 유틸리티 ─────────────────────────────────────────────── */
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit',
})

export function startOfLocalDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function formatDateParam(date: Date): string {
  return DATE_FORMATTER.format(date)
}
