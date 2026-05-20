# TODO

---

## DB 관리

### 오래된 시간표 자동 삭제 (pg_cron)

- 3일 지난 showtimes 레코드 매일 새벽 3시 자동 삭제
- Supabase SQL 에디터에서 아래 순서로 실행:

  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  SELECT cron.schedule(
    'cleanup-old-showtimes',
    '0 3 * * *',
    $$DELETE FROM showtimes WHERE show_date < CURRENT_DATE - INTERVAL '3 days'$$
  );

  SELECT * FROM cron.job;
  ```

- 수동 즉시 실행: `DELETE FROM showtimes WHERE show_date < CURRENT_DATE - INTERVAL '3 days';`

---

## 바로 실행 가능 (스크립트 존재)

### 포스터 없는 영화 채우기

- 우선순위: KMDB → Wikipedia → Naver 이미지 검색 순서로 실행
  ```
  npx tsx --env-file=.env.local scripts/fill-poster-kmdb.ts --apply
  npx tsx --env-file=.env.local scripts/fill-poster-wiki.ts --apply
  npx tsx --env-file=.env.local scripts/fill-poster-naver.ts --apply
  ```
- 그래도 없는 영화는 프로젝트 루트에 이미지 파일 넣으면 Supabase Storage 업로드 후 DB 연결
- Naver API: `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` 필요 (developers.naver.com 앱 등록 → 검색 API)

### 시놉시스 채우기

- 상태: 대부분 반영 완료
- 확인: `scripts/fill-synopsis-kmdb.ts`는 현재 `movie_details.synopsis`와 KMDB `plots.plot[].plotText` 필드를 사용
- 실행 결과: 171편 중 165편 시놉시스 있음, 6편 없음
- KMDB 미제공으로 남은 6편: 노스탤지아, 박하향 소다수, 애수의 여로, 용호의 결투, 진홍의 도적, 피어스 브로스넌의 영웅
- 재실행:
  ```
  npx tsx --env-file=.env.local scripts/fill-synopsis-kmdb.ts
  ```

### 감독 프로필 재수집

- 현재 132명 중 105명 데이터 없음 (Wikipedia 검색 미히트)
- `--force` 플래그로 재수집하거나, 데이터 없는 감독 수동 입력 검토:
  ```
  npx tsx --env-file=.env.local scripts/fill-directors.ts --apply --force
  ```

---

## 릴리즈 전 필수

### 극장 좌표 검증 및 교체

- DB에 seed된 좌표 일부가 임의 입력값으로 정확하지 않을 수 있음
- Google Maps Geocoding API / 네이버지도 / 카카오맵으로 실제 좌표 검증·교체 필요
- 같은 건물에 입주한 극장(낙원빌딩 등)은 실제 좌표 확인 후 오프셋 제거 여부 결정

### 극장 인스타그램 계정 보정

- 상태: 일부 반영
- 보정 스크립트: `scripts/fill-theater-instagrams.ts`
- 실행 결과: 39개 극장 중 22개 인스타그램 있음, 17개 미확인
- 확인 후 수정: 필름포럼의 불확실한 계정 제거, 씨네Q 신도림/자유로자동차극장 계정 추가
- 미확인/미보유: KT&G 상상마당 시네마 대치, KU시네마테크, 광주극장, 금성시네마, 낭만극장, 명화극장, 밀양시네마, 씨네인디U, 아리랑시네센터, 애관극장, 오르페오, 인디플러스포항, 제천시네마, 천안인생극장, 필름포럼, 허리우드클래식, 헤이리시네마
- 재실행:
  ```
  npx tsx --env-file=.env.local scripts/fill-theater-instagrams.ts --apply
  ```

### 지도 성능 확인

- 상태: 일부 반영
- 반영됨: 극장 핀 `DivIcon` 캐시, 지하철역 아이콘 캐시
- 반영됨: zoom/bounds 변경을 `ViewportTracker`에서 묶어 처리
- 반영됨: zoom 15 이상에서 지하철역 마커를 현재 화면 bounds + padding 안의 역만 렌더
- 반영됨: zoom 15 진입 시 지하철 노선 GeoJSON/역 마커 레이어를 짧게 지연 마운트
- 미확인: 실제 브라우저에서 zoom 14 → 15 진입 시 DOM 개수, 프레임 드랍, 콘솔 에러 재검증
- 후속: 그래도 느리면 GeoJSON 노선 단순화 또는 viewport clipping 검토

### 광고 붙을 경우 지도 타일 제공사 전환

- 현재 CARTO free tier는 상업 이용 시 유료 전환 필요
- Stadia Maps (`alidade_smooth_dark`) 월 $14 플랜 또는 다른 상업 허용 제공사로 교체

---

## 크롤링

### 신규 영화 자동 등록 + 상세정보 연결

- 상태: 반영
- 크롤링 후보 자동매칭/승인 시 기존 `movies`에 없는 영화는 KMDB 검색 후 자동 import
- import 시 `movies` 기본 정보와 `movie_details.synopsis/runtime_minutes/certification`을 함께 upsert
- KMDB 줄거리는 `plots.plot[].plotText` 한국어 우선, 없으면 첫 번째 plot, 그래도 없으면 `plot` fallback 사용
- 동일 흐름을 관리자 UI 경로(`src/lib/admin/store.ts`)와 수동 승인 스크립트(`scripts/seed-candidates.ts`)에 모두 반영

### 크롤링 오류 수정

- 크롤링 실행 시 발생하는 오류 확인 및 수정

### 어드민 페이지 정리

- 어드민 UI에서 보기 어렵거나 불편한 부분 파악 후 개선

### 자동 매칭 실패 케이스 수정

- GV, 시네토크 등 부가 행사가 제목에 붙은 경우 자동 매칭이 안 됨
- 크롤링 후보 정규화 또는 매칭 로직에서 처리

### 크롤러 GitHub Actions 마이그레이션 검토

- 현재 수동 실행 → GitHub Actions 스케줄 트리거로 자동화 가능한지 확인
- Supabase 환경변수 Secrets 등록, 실행 주기 설계 필요

### 크롤링 후보 제목 정규화

- `영화 제목 + 시네토크/GV/강연자`가 한 문자열로 내려오는 경우
- 후보 생성 단계에서 `+ 시네토크`, `+ GV` 등 부가 행사 문구를 별도 메모로 분리하고 `movie_title`에는 본편 제목만 남기기

### 인디스페이스

- 최신 주간 상영시간표가 이미지로 내려와 HTML 파서로 추출 불가
- 후보: ① OCR 파이프라인, ② `작품별 상영일정` 게시글 본문에서 일정 추출
- 별도 설계 필요

### 필름포럼 → Moviee 어댑터로 전환

- 공식 사이트 WAF가 자동 요청 차단 (`999`)
- Moviee `https://moviee.co.kr/Theater/Index?thsynid=130` 기반 어댑터로 등록

### KU시네마테크 → Moviee 어댑터로 전환

- `/reservation`이 `https://moviee.co.kr/Movie/Ticket?tid=121`로 연결됨
- 전용 어댑터 대신 기존 Moviee 어댑터 대상으로 분류

---

## 바텀시트

### 상영 편수 표기 방식 검토

- 현재 "19편 상영" = 극장 전체 등록 편수인지, 선택일 상영 편수인지 불명확
- "이 날 N편 상영" 형태로 선택일 기준으로 바꾸는 게 더 직관적이지 않을까?
- 총 편수와 이 날 편수 둘 다 필요한 정보인지도 검토 필요

### "이 날 상영하는 영화만 보기" 체크박스 — UX 재검토 필요

- 구현은 되어 있으나 현재 주석 처리 비활성화 (TheaterSheet.tsx)
- 체크박스 방식보다 더 나은 UX 패턴 검토 필요
  - 날짜 선택 시 자동으로 해당 날 상영작 우선 정렬?
  - 탭/토글 형태로 "전체 / 이 날만" 전환?
  - 상영 없는 영화에 dim + 취소선 대신 아예 숨기는 게 나을지도
- 재활성화 전에 인터랙션 방식 확정 후 구현

### 스크롤 가능 영역 시각적 힌트

- expanded 상태에서 시놉시스/시간표 스크롤 가능 여부가 안 보임
- 하단 fade-out 그라디언트 또는 "스크롤하여 더 보기" 표시 추가

---

## 검색 오버레이 (미구현 항목)

- 영화별 상영 극장 3개/더보기 섹션
- 역 선택 시 주변 지역/근처 극장 섹션 연결
- 필터바 "영화" / "감독" 칩 클릭 시 검색창 UI 다르게 표시 (카테고리 pre-select)

---

## 데이터 연결

### Mock 카탈로그 제거

- `src/lib/catalog/client.ts`: mock을 placeholderData로 사용 중
- `src/app/search/page.tsx`가 `useCatalog()` 사용 — Supabase 기반 쿼리로 교체 필요

---

## 콘텐츠 / 데이터 확장

### 이벤트 상영 표시 검토

- 영화제, 무비올나잇, 옥상 상영 등 특별 이벤트를 지도/시트에 표시할지 여부 결정
- 표시한다면 이벤트 데이터 수집 방식 및 UI 설계 필요

### 감독 상세 페이지 정보 보강

- 현재 Wikipedia API로 받아오는데 내용 부실, 설명 없는 경우도 있음
- 대안 소스 검토 (KMDb, KOBIS, 직접 입력 등)

### 영화관별 인스타그램 태그 추가

- 각 극장 인스타 계정 수집 후 DB에 저장
- 극장 시트에서 인스타 링크 노출

### 서울 외 지역 영화관 추가

- 부산, 대구, 광주 등 주요 독립·예술영화관 확장
- 크롤러 지역 확장 및 지도 초기 위치 설정 검토

---

## 계정 / 앱 전환 검토

### 계정 기능 도입 시 가능한 것들

- 관심 영화 / 극장 즐겨찾기
- 관람 기록
- 개인화 추천 (장르, 감독 기반)
- 알림 (개봉, 상영 일정 변경 등)

### 앱 전환 검토

- 계정 기능 붙이는 시점에 PWA 또는 React Native / Expo로 전환 고려

---

## 분석 / UX 리서치

### GA4 연동

- Google Analytics 4 측정 ID 발급 후 Next.js에 삽입
- 방법: `src/app/layout.tsx`에 `<Script>` 태그로 gtag.js 추가, 또는 `@next/third-parties/google`의 `GoogleAnalytics` 컴포넌트 사용 (Next.js 공식 권장)
  ```tsx
  import { GoogleAnalytics } from "@next/third-parties/google";
  <GoogleAnalytics gaId="G-XXXXXXXXXX" />;
  ```
- 환경변수 `NEXT_PUBLIC_GA_ID`로 관리, Vercel에도 추가

### 주요 이벤트 트래킹 후보

- 극장 핀 클릭 (`theater_pin_click`)
- 영화 검색 (`search`, `search_type: movie|area|station|director`)
- 영화 상세 진입 (`movie_detail_view`)
- 예매 링크 클릭 (`booking_click`)
- 필터 사용 (`filter_apply`, `filter_type: date|genre|nation|movie`)
- 공유 버튼 클릭 (`share`)

### Hotjar / Microsoft Clarity (선택)

- 세션 녹화 + 히트맵으로 실제 사용 패턴 파악
- Clarity는 무료 무제한, 설치 방법은 GA4와 동일하게 `<Script>` 삽입

---

## 기술 부채

### 전반적 코드 리팩터링

- MapView.tsx 등 파일 크기가 너무 커진 컴포넌트 분리
- 중복 로직 정리, 타입 정의 통합
- Clean Architecture 원칙에 맞게 레이어 재정비

### 빌드 타입체크 정리

- 상태: 반영 완료
- `scripts/check-kmdb-plot.ts`를 모듈로 표시해 전역 `main()` 중복 구현 오류 해결
- `npm run build` 통과 확인
- 남은 경고: Next.js workspace root 추론 경고, `metadataBase` 미설정 경고

---

## 지도 저작권

- 서비스 소개 또는 설정 페이지에 표기 필요
- 지도 타일: © OpenStreetMap contributors, © CARTO
