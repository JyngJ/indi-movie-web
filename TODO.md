# TODO

---

## DB 관리

### 오래된 시간표 자동 삭제 (pg_cron)
- 3일 지난 showtimes 레코드 매일 새벽 3시 자동 삭제
- Supabase SQL 에디터에서 아래 순서로 실행:
  ```sql
  -- 1. 익스텐션 활성화 (Dashboard → Database → Extensions에서도 가능)
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- 2. 스케줄 등록
  SELECT cron.schedule(
    'cleanup-old-showtimes',
    '0 3 * * *',
    $$DELETE FROM showtimes WHERE show_date < CURRENT_DATE - INTERVAL '3 days'$$
  );

  -- 등록 확인
  SELECT * FROM cron.job;
  ```
- 수동 즉시 실행: `DELETE FROM showtimes WHERE show_date < CURRENT_DATE - INTERVAL '3 days';`

---

## 바로 실행 가능 (스크립트 존재)

### 포스터 없는 영화 TMDB 폴백
- 포스터 없는 6편: 박하향 소다수, 불안, 여행자, 용호의 결투, 침묵의 빛, 핵전략 사령부
- `.env.local`에 `TMDB_API_KEY` 추가 후 실행:
  ```
  npx tsx --env-file=.env.local scripts/fill-poster-tmdb.ts --apply
  ```

### 시놉시스 채우기
- 44편 전부 synopsis 비어있음
- KMDB `plots.plot[].plotText` 필드 사용 (기존 스크립트는 `hit.plot` 잘못 참조 — 수정 필요 여부 확인 후 실행):
  ```
  npx tsx --env-file=.env.local scripts/fill-synopsis-kmdb.ts --apply
  ```

---

## 확인 필요

### 공유 버튼 HTTPS 테스트
- `navigator.share`는 secure context(HTTPS)에서만 동작
- 로컬 `http://192.168.x.x:3000`에서는 작동 안 함 — Vercel 배포 URL로 검증 필요

---

## 릴리즈 전 필수

### 극장 좌표 검증 및 교체
- DB에 seed된 좌표 일부가 임의 입력값으로 정확하지 않을 수 있음
- Google Maps Geocoding API / 네이버지도 / 카카오맵으로 실제 좌표 검증·교체 필요
- 같은 건물에 입주한 극장(낙원빌딩 등)은 실제 좌표 확인 후 오프셋 제거 여부 결정

### 제보/추가요청 버튼
- 극장 정보 오류, 좌표 오류, 누락 극장·영화 추가 요청 창구
- 초기: 폼 제출 또는 이메일/관리자 확인 큐
- 장기: `reports` 테이블 + 어드민 처리 화면

---

## 크롤링

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

### 라이카시네마 → Dtryx 어댑터로 전환
- 예매 링크가 Dtryx로 연결됨
- `dtryxReservationApi` 소스로 등록 및 검증

---

## 바텀시트

### 상영작 먼저 보기 버튼
- 포스터 스트립에 토글 추가
- ON: 선택 날짜 상영 가능 영화를 앞으로 정렬 / OFF: 기본(상영 횟수 순) 복원

### 스크롤 가능 영역 시각적 힌트
- expanded 상태에서 시놉시스/시간표 스크롤 가능 여부가 안 보임
- 하단 fade-out 그라디언트 또는 "스크롤하여 더 보기" 표시 추가

---

## 검색 오버레이 (미구현 항목)

- 영화별 상영 극장 3개/더보기 섹션
- 역 선택 시 주변 지역/근처 극장 섹션 연결

---

## 데이터 연결

### Mock 카탈로그 제거
- `src/lib/catalog/client.ts`: mock을 placeholderData로 사용 중
- `src/app/search/page.tsx`가 `useCatalog()` 사용 — Supabase 기반 쿼리로 교체 필요

### 영화 필터 칩 → 상영 극장 조회 연결
- 영화 필터 칩 선택 시 해당 영화를 상영 중인 극장만 지도에 표시

---

## 지도 저작권

- 서비스 소개 또는 설정 페이지에 표기 필요
- 지도 타일: © OpenStreetMap contributors, © CARTO
