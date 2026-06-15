/**
 * KMDB 등 원본 데이터의 토큰화 아티팩트로 "기억 저편 의 장소"처럼
 * 조사 "의" 앞에 불필요한 공백이 들어가는 제목을 "기억 저편의 장소"로 정리한다.
 */
export function normalizeTitle(title: string): string {
  return title.replace(/ 의(?= |$)/g, '의')
}
