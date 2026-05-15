export const GENRES = [
  '드라마', '다큐멘터리', '애니메이션', '액션',
  'SF', '판타지', '스릴러/호러', '코미디',
  '뮤지컬', '실험/예술', '단편', '로맨스',
] as const

export type Genre = typeof GENRES[number]

const RAW_TO_GENRE: Record<string, Genre> = {
  // 드라마
  '드라마': '드라마',
  '청춘영화': '드라마',
  '로드무비': '드라마',
  '동성애': '드라마',
  '사회물(경향)': '드라마',
  '사회': '드라마',
  '역사': '드라마',
  '인물': '드라마',
  '전기': '드라마',
  '느와르': '드라마',
  '전쟁': '드라마',
  '스포츠': '드라마',
  '가족': '드라마',
  '시대극/사극': '드라마',
  // 다큐멘터리
  '다큐멘터리': '다큐멘터리',
  '뮤직': '다큐멘터리',
  '문화': '다큐멘터리',
  // 애니메이션
  '애니메이션': '애니메이션',
  // 액션
  '액션': '액션',
  '활극': '액션',
  '무협': '액션',
  '어드벤처': '액션',
  // SF
  'SF': 'SF',
  // 판타지
  '판타지': '판타지',
  // 스릴러/호러
  '스릴러': '스릴러/호러',
  '공포': '스릴러/호러',
  '범죄': '스릴러/호러',
  '미스터리': '스릴러/호러',
  // 코미디
  '코미디': '코미디',
  '코메디': '코미디',
  '하이틴(고교)': '코미디',
  // 뮤지컬
  '뮤지컬': '뮤지컬',
  // 실험/예술
  '실험': '실험/예술',
  // 단편
  '단편': '단편',
  // 로맨스
  '멜로/로맨스': '로맨스',
  '멜로드라마': '로맨스',
  '멜로 / 로맨스': '로맨스',
}

export function normalizeGenre(raw: string): Genre | null {
  return RAW_TO_GENRE[raw.trim()] ?? null
}

/** raw 장르 배열 → 중복 없는 표준 Genre 배열 (GENRES 순서 유지) */
export function normalizeGenres(raws: string[]): Genre[] {
  const found = new Set<Genre>()
  for (const raw of raws) {
    const g = normalizeGenre(raw)
    if (g) found.add(g)
  }
  return GENRES.filter(g => found.has(g))
}
