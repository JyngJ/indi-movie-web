export interface KobisMovieMatch {
  movieCd: string
  movieNm: string
  /** "YYYYMMDD" 개봉일자, 미공개면 빈 문자열 */
  openDt: string
}

export interface KobisDailyBoxOffice {
  /** "YYYYMMDD" */
  targetDt: string
  scrnCnt: number
}

/** 어댑터가 실제 fetch를 감싼 부분 — 테스트에서 fixture 응답으로 주입 */
export type KobisFetchJson = (url: string) => Promise<unknown>
