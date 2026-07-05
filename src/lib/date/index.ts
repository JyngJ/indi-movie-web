/**
 * 날짜/시간 공용 유틸 — 순수 함수만 둔다 (프레임워크·DB 의존 금지).
 *
 * 주의: `formatLocalDate`(실행 환경의 로컬 타임존)와 `toKstIsoDate`(항상 KST)는
 * 의미가 다르다. 서버(UTC)와 브라우저(KST)에서 같은 "오늘"이 필요하면
 * `toKstIsoDate`, 사용자 기기 기준 날짜가 필요하면 `formatLocalDate`를 쓴다.
 */

/** "YYYY-MM-DD" 문자열에 UTC 기준으로 days일을 더한다. 타임존 무관한 순수 문자열 연산. */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Date → "YYYY-MM-DD" — 실행 환경의 **로컬 타임존** 기준.
 * 서버에서 실행되면 서버 타임존(Vercel은 UTC)을 따른다. 항상 KST가 필요하면 `toKstIsoDate` 사용.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Date → "YYYY-MM-DD" — 실행 환경과 무관하게 **항상 KST(Asia/Seoul)** 기준.
 * 서버(Vercel, UTC)와 클라이언트(사용자 브라우저, KST 가정) 모두에서 동일한 "오늘" 날짜를 얻기 위한 변환.
 */
export function toKstIsoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date)
}

/** Date → "HH:MM" — 실행 환경의 로컬 타임존 기준 (showtimes.show_time 비교용). */
export function formatLocalTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
