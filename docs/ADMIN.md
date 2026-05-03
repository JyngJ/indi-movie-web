# 관리자 기능 설계

> 독립·예술영화관 상영시간표를 운영자가 수집, 검수, 승인, 업로드하는 흐름.

## 목표

- 극장별 홈페이지, 운영자 CSV, HTML 붙여넣기에서 상영시간표 후보를 빠르게 수집한다.
- 수집 결과를 바로 서비스 데이터로 넣지 않고 `draft` 또는 `needs_review` 상태로 보관한다.
- 운영자는 신뢰도, 경고, 원문을 보고 승인/반려한다.
- 이후 Supabase 또는 자체 DB가 확정되면 현재 in-memory 저장소를 영속 저장소로 교체한다.

## 운영 흐름

```
크롤링 소스 선택
  ↓
URL / HTML / CSV / 샘플 fixture 입력
  ↓
서버 Route Handler가 원본 수집
  ↓
파서가 표준 후보 레코드로 정규화
  ↓
fingerprint 기준 중복 제거
  ↓
신뢰도와 warnings 부여
  ↓
운영자 검수
  ↓
승인된 후보만 실제 showtimes 업로드 대상으로 이동
```

## 구현 위치

| 파일 | 역할 |
|------|------|
| `src/app/admin/page.tsx` | 관리자 페이지 진입점 |
| `src/app/admin/AdminShowtimeConsole.tsx` | 수집 실행, 검수, 승인 UI |
| `src/app/api/admin/crawl/route.ts` | 크롤링 실행 API |
| `src/app/api/admin/sources/route.ts` | 크롤링 소스 조회/추가 API |
| `src/app/api/admin/showtimes/route.ts` | 검수 대기열 조회/상태 변경 API |
| `src/lib/admin/sources.ts` | 극장별 크롤링 소스 설정과 샘플 원본 |
| `src/lib/admin/crawler.ts` | HTML/JSON-LD/CSV 파서와 정규화 로직 |
| `src/lib/admin/store.ts` | 크롤링 소스, 실행 이력, 후보 상태 저장소 |
| `src/types/admin.ts` | 관리자 도메인 타입 |

## 크롤링 소스 관리

운영자는 `/admin`의 왼쪽 패널에서 새 크롤링 소스를 추가할 수 있다.

필수 입력값은 아래와 같다.

- 극장명
- 상영시간표 URL
- 파서 유형: `tableText`, `timelineCard`, `jsonLdEvent`, `csv`
- 수집 주기: `manual`, `daily`, `twice_daily`

홈페이지 URL은 비워두면 상영시간표 URL의 origin으로 대체한다. 새 소스를 저장하면 즉시 선택 상태가 되고 입력 방식은 `URL 크롤링`으로 전환된다.

## 크롤링 파서 전략

현재 파서는 세 가지 입력을 지원한다.

- `fixture`: 개발/시연용 샘플 HTML
- `url`: 서버에서 URL을 fetch한 뒤 파싱
- `html`: 운영자가 복사한 HTML 조각 파싱
- `csv`: 운영자 CSV 업로드용 텍스트 파싱

HTML 파서는 우선 JSON-LD `Event` 블록을 읽고, 없거나 부족하면 `showtime`, `schedule`, `time` 관련 HTML 조각을 텍스트로 정규화한다. 각 후보에는 아래 품질 정보를 붙인다.

인디스페이스처럼 표가 아니라 날짜 라벨과 시간축 카드로 렌더링되는 페이지는 `timelineCard` 패턴으로 처리한다. 이 파서는 `dateLabel` 아래의 `cardContainer`를 순회하며 `nameBox`, `schedule`, `salingInfo`, `venue` 텍스트에서 제목, 상영시간, 잔여석, 상영관 힌트를 추출한다.

- `confidence`: 날짜, 시간, 제목, 상영관 추출 품질 기준의 0-1 점수
- `warnings`: 상영관/제목/시간 누락 등 운영자 확인이 필요한 항목
- `fingerprint`: `theaterId|movieTitle|showDate|showTime|screenName` 기반 중복 제거 키

## DB 연동 시 교체 지점

현재 `src/lib/admin/store.ts`는 서버 프로세스 메모리에만 저장한다. 실제 운영 전에는 아래 테이블 또는 Supabase 뷰로 교체한다.

- `crawl_sources`: 극장별 source URL, parser, cadence, health
- `crawl_runs`: 실행 이력, 상태, 오류, 카운트
- `showtime_candidates`: 후보 레코드, raw text, warnings, confidence, status
- `showtimes`: 승인 후 서비스에 노출되는 최종 상영시간표

승인 API는 현재 candidate 상태만 바꾸지만, 실제 DB에서는 `approved` 전환 시 `showtimes` upsert와 감사 로그 기록을 같은 트랜잭션으로 처리한다.

## 다음 확장

- 극장별 전용 parser adapter 추가
- Playwright 기반 동적 페이지 수집 worker 분리
- 예약된 daily crawl job 추가
- 관리자 인증과 role 검사
- 후보 diff 화면과 영화/극장 매칭 보정 UI
