import type { CSSProperties } from 'react'

/**
 * 크롤러는 읽고 사람 눈엔 안 보이는 본문용 스타일.
 * `display:none`이 아니라 clip 방식이라 검색엔진이 정상 인덱싱한다 —
 * 페이지 의도와 일치하는 진짜 콘텐츠이므로 cloaking이 아니다.
 */
export const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}
