/* -- 날짜 헬퍼 ---------------------------------------------------- */
export const DOW = ['일', '월', '화', '수', '목', '금', '토']

export function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
export function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
export function fmtFull(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`
}
function fmtShortDow(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()} ${DOW[d.getDay()]}`
}
export function fmtMD(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}
export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function buildDateOptions(t = today()) {
  const dow = t.getDay()
  const daysToSat = dow === 0 ? 6 : 6 - dow
  const sat0 = addDays(t, daysToSat)
  const sun0 = addDays(sat0, 1)
  const sat1 = addDays(sat0, 7)
  const sun1 = addDays(sat1, 1)
  const weekEnd = dow === 0 ? addDays(t, 6) : addDays(t, 7 - dow)

  return [
    { id: 'today', label: '오늘', sub: fmtFull(t) },
    { id: 'tomorrow', label: '내일', sub: fmtFull(addDays(t, 1)) },
    { id: 'this-weekend', label: '이번 주말', sub: `${fmtShortDow(sat0)} - ${fmtShortDow(sun0)}` },
    { id: 'next-weekend', label: '다음 주말', sub: `${fmtShortDow(sat1)} - ${fmtShortDow(sun1)}` },
    { id: 'this-week', label: '일주일간', sub: `${fmtMD(t)} - ${fmtMD(addDays(t, 6))}` },
    { id: 'this-month', label: '이번 달', sub: `${t.getMonth() + 1}월 전체` },
  ] as const
}

export type DateId = 'today' | 'tomorrow' | 'this-weekend' | 'next-weekend' | 'this-week' | 'this-month' | 'custom' | null
