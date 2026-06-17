# 영화 탭 남은 작업

## 1. 감독 상세 페이지 `/director/[name]`

- 감독 프로필 사진 (Wikipedia API — `scripts/fetch-director-photos.ts` 준비됨, `directors` 테이블 `photo_url` 컬럼 추가 필요)
- 감독 소개 (filmography, 대표작)
- 현재 상영 중인 영화 목록
- 지도 탭과 연동 (감독 필터 클릭 → 지도에서 해당 감독 영화만 표시)

## 2. 영화 상세 페이지 개선 (현재 `/movie/[id]` 존재, 영화 탭과 연동 부족)

- 영화 탭 → 포스터 클릭 → 상세 페이지 이동 연결
- 상세 페이지에서 "지도에서 보기" 버튼 → 지도로 이동하며 해당 영화 필터 적용
- 영화 탭 내 인라인 상세 시트 (별도 페이지 이동 없이 슬라이드 업)

## 3. 전체 영화 리스트 페이지 `/films/all`

- 현재 상영 중인 독립영화 전체 그리드
- 검색 + 필터 (지역·장르·감독)
- 무한 스크롤 또는 페이지네이션
- 정렬 옵션 (상영관 수, 주간 랭킹, 최신순)

## 4. 감독 프로필 사진 파이프라인

- Supabase `directors` 테이블 `photo_url TEXT` 컬럼 추가 (또는 `movies.director_photo_url`)
- `scripts/fetch-director-photos.ts --apply` 실행 (364명 대상, Wikipedia API)
- `DirectorSpotlightSection`에서 프로필 이미지 표시

## 5. 기타

- RPi 크론 추가: `0 6 * * 1 npm run curate:weekly-ranking` (주간 랭킹 자동 갱신)
- 영화 탭 큐레이션 섹션 클릭 → 영화 상세로 이동 (현재 동작 없음)
