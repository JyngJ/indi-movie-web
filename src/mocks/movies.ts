export interface MockMovie {
  id: string
  title: string
  // src 없음 — PosterThumb placeholder 사용
}

export const MOCK_MOVIES: MockMovie[] = [
  { id: 'm1', title: '비밀의 언덕' },
  { id: 'm2', title: '세 번째 살인' },
  { id: 'm3', title: '아노라' },
  { id: 'm4', title: '패스트 라이브즈' },
  { id: 'm5', title: '콘크리트 유토피아' },
  { id: 'm6', title: '다음 소희' },
]
