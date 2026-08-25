/**
 * 외부 이미지 URL 정규화.
 *
 * DB에 남아 있는 `http://` 이미지(KMDB 포스터·감독 사진 대부분)는 https 페이지에서
 * mixed content로 브라우저가 차단한다 — `<img>`로 직접 그리는 지도 포스터가 통째로
 * 빈칸이 됐다. next/image를 타는 화면은 서버가 대신 받아와서 안 깨지므로 증상이
 * 화면마다 달라 보였다.
 *
 * 원본 호스트(file.koreafilm.or.kr 등)는 https도 같은 경로로 서빙하므로 스킴만 올린다.
 * DB 일괄 수정(docs/SUPABASE_HTTPS_IMAGES.sql)과 별개로, 크롤러·KMDB 스크립트가 다시
 * http를 넣어도 화면이 깨지지 않도록 읽기 경로에서도 항상 통과시킨다.
 */
export function toSecureImageUrl(url: string): string
export function toSecureImageUrl(url: string | null | undefined): string | undefined
export function toSecureImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url
}
