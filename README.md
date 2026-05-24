# 영화볼지도 — 독립·예술영화관 상영 통합 조회

서울·수도권 각지에 흩어진 독립·예술영화관의 상영 정보를 한 곳에서 찾을 수 없다는 불편함에서 시작한 프로젝트입니다. 디자이너 1인이 기획·디자인을 담당하고, 개발자 1인이 합류해 프론트엔드·백엔드·데이터 파이프라인을 함께 구현했습니다. AI 코딩 도구(Claude Code)를 설계 단계부터 구현까지 실무 흐름에 통합해 소규모 팀의 개발 속도와 코드 품질을 함께 높이는 방식을 실험했습니다.

---

## 핵심 기능

**지도 기반 탐색**
- 서울·수도권 독립·예술영화관 핀 표시, 클러스터링, 극장 선택 시 바텀시트 슬라이드 인
- 핀에 상영 중인 영화 포스터를 직접 렌더링 (줌 레벨 연동)
- 지하철 노선·역 오버레이 (줌 15 이상, 뷰포트 컬링으로 성능 최적화)
- 장르·국가·예매 가능 여부 필터 — 필터 적용 시 해당 안 되는 영화는 반투명 오버레이로 구분

**극장 바텀시트**
- 영화 포스터 스트립, 날짜별 상영시간표, 길찾기·공유·인스타그램 딥링크
- 지도 필터 상태를 바텀시트 필터로 자동 인계, 독립적으로 재조정 가능
- 필터 팝업: 장르(12개 표준 분류) / 국가 / 예매 가능 여부

**데이터 파이프라인**
- 극장별 웹사이트 크롤러(어댑터 패턴) + KMDB API 매칭으로 자동 수집
- 어드민 콘솔에서 후보 검수·승인 후 DB 반영
- KMDB raw 장르값 → 12개 표준 카테고리 정규화 (멜로/로맨스 → 로맨스 등)

**제보하기**
- 영화관 추가 요청·버그 제보·데이터 수정 등 카테고리별 인앱 제보 폼
- 제보 접수 시 Discord 채널에 자동 전송 + 봇 버튼으로 저장/삭제 처리

---

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 16 App Router | SSR + React Query 조합, 향후 서버 액션 확장 |
| 언어 | TypeScript (strict) | 타입이 문서 역할, 소규모 팀에서 인터페이스 계약 역할 |
| 서버 상태 | TanStack React Query v5 | 캐시·재검증 전략을 선언적으로 관리 |
| 스타일 | Tailwind CSS v4 + CSS Variables | 디자인 토큰 기반, 라이트/다크 모드 |
| 지도 | Leaflet + react-leaflet v5 | 커스텀 DivIcon으로 포스터 핀 렌더링 |
| DB | Supabase PostgreSQL | RLS, 실시간, 인증을 한 곳에서 |
| 클라이언트 상태 | Zustand v5 | 테마, 지도 UI 상태 |

---

## 개발 방식

### 디자인 → 개발 워크플로

1. **와이어프레임 정의**: 기획·UX 흐름을 와이어프레임으로 직접 설계
2. **디자인 시스템 수립**: Claude 디자인 도구로 컴포넌트 시트 및 토큰 체계를 `docs/DESIGN.md`로 정리 — 색상·타이포그래피·간격 토큰, 라이트/다크 모드, 컴포넌트 계층 정의
3. **컴포넌트 구현**: `DESIGN.md` + `CLAUDE.md`(아키텍처 규칙)를 기반으로 Claude Code와 페어 프로그래밍해 컴포넌트·화면 구성

### AI 도구 실무 통합

Claude Code, OpenAI Codex, Cursor 세 가지 AI 코딩 도구를 용도에 따라 병행해 활용했습니다. Claude Code는 설계 파트너 역할로 — 복잡한 상태 설계(필터 흐름, 바텀시트 애니메이션), 크롤러 어댑터 아키텍처, 지도 핀 렌더링 최적화(icon 캐싱·뷰포트 컬링·줌 배칭) 등 트레이드오프가 있는 지점을 함께 검토하며 구현했고, Codex는 어드민 크롤링 파이프라인 초기 구현에, Cursor는 인라인 편집·빠른 수정에 활용했습니다. 전체 커밋의 약 2/3에 AI가 공동 기여자로 기록되어 있습니다.

---

## 구현 하이라이트

### 포스터 핀 렌더링
지도 핀 내부에 영화 포스터를 직접 그리기 위해 Leaflet `DivIcon` + `renderToStaticMarkup`을 조합했습니다. 줌 레벨에 따라 포스터 수·크기가 동적으로 결정되고, 필터가 활성화된 경우 매칭되지 않는 영화는 반투명 처리 + "조건 외" 오버레이로 표시합니다. 같은 건물에 위치한 극장은 원형 배치로 핀이 겹치지 않도록 오프셋을 계산합니다.

### 지도 성능 최적화
줌·패닝 시 발생하는 렌더 횟수를 줄이기 위해 `zoomRef` + `recomputeRef` 패턴으로 줌 상태와 클러스터 계산을 한 React 렌더 사이클에 배칭합니다. 지하철 역 마커는 뷰포트 bounds 컬링으로 화면 밖 수백 개의 DOM 노드 생성을 방지하고, 역·핀 아이콘을 모듈 레벨 `Map`으로 캐싱해 줌 변경 시 재계산을 막습니다.

### 바텀시트 필터 상태 설계
지도 필터(장르·국가)를 바텀시트가 열릴 때만 단방향으로 인계하고, 바텀시트에서 변경해도 지도에는 영향이 없습니다. "지도에서 필터 설정 → 바텀시트로 상세 확인 → 필터 조정" 흐름이 자연스럽게 이어지도록 설계했습니다.

### 크롤러 어댑터 패턴
극장마다 다른 웹사이트 구조를 `CrawlerAdapter` 인터페이스로 추상화했습니다. 새 극장을 추가할 때 어댑터 하나만 작성하면 파이프라인 전체에 연결됩니다. HTML 파서, Dtryx 예매 API, Moviee API 등 여러 방식을 동일한 인터페이스로 정규화합니다.

---

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
│   ├── page.tsx            # 홈 (지도 뷰)
│   ├── movie/[id]/         # 영화 상세
│   ├── director/[name]/    # 감독 필모그래피
│   ├── admin/              # 크롤링 후보 검수·어드민 콘솔
│   └── api/
│       ├── reports/        # 제보 접수 API
│       └── discord/        # Discord 봇 인터랙션 처리
│
├── components/
│   ├── primitives/         # 재사용 UI 원자 (Button, BottomSheet, Toast …)
│   ├── domain/             # 서비스 도메인 컴포넌트
│   │   ├── FilterBar       # 날짜·장르·국가·예매 가능 필터 바
│   │   ├── TheaterSheet    # 극장 바텀시트 (포스터·시간표·필터)
│   │   ├── MapPin          # 포스터 핀
│   │   └── PosterThumb     # 영화 포스터 썸네일
│   └── map/
│       ├── MapView.tsx     # 전체화면 지도 + 검색 + 지하철 오버레이
│       ├── MapControls.tsx # ZoomSlider, ZoomTracker, ViewportTracker, FAB 등
│       └── PosterGrid.tsx  # 바텀시트 포스터 그리드
│
├── lib/
│   ├── map/                # 지도 순수 함수 (posterLogic, subwayUtils, searchScoring …)
│   ├── reports/            # 제보 타입·저장·Discord 전송
│   ├── supabase/           # Supabase client + React Query hooks
│   ├── admin/              # 크롤러·KMDB·어드민 로직
│   └── adapters/           # 위치·스토리지 어댑터
│
├── hooks/                  # 재사용 React 훅 (useIsDark, useIsDesktopLayout …)
│
└── types/                  # 공유 TypeScript 타입
```

---

## 로드맵

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 디자인 시스템, 토큰, 컴포넌트 | ✅ 완료 |
| 2 | 지도, 극장 탐색, 바텀시트, 지하철 오버레이 | ✅ 완료 |
| 3 | 영화·감독 검색, 상영시간표, 필터 시스템 | ✅ 완료 |
| 4 | 제보하기, Discord 운영 봇, 수도권 극장 확대 | ✅ 완료 |
| 5 | 사용자 인증, 즐겨찾기 | 예정 |
| 6 | 네이티브 앱(Capacitor) 확장 | 예정 |

---

## 로컬 실행

```bash
npm install
npm run dev   # → http://localhost:3000
```

> Node 18+, `.env.local` 환경 변수 필요 (Supabase URL·키).  
> 이 프로젝트는 Turbopack을 사용하지 않습니다 (`--webpack` 강제).

분석 도구 설정과 이벤트/대시보드 정의는 [`docs/ANALYTICS.md`](docs/ANALYTICS.md)에 정리되어 있습니다.

---

## 데이터베이스

### 자동 정리

**3일 이상 지난 상영시간표 자동 삭제** (PostgreSQL pg_cron)
- 매일 새벽 3시(UTC) 자동 실행
- 대상: `show_date < CURRENT_DATE - INTERVAL '3 days'`인 `showtimes` 레코드
- Job ID: `cleanup-old-showtimes`
- 수동 실행: `DELETE FROM showtimes WHERE show_date < CURRENT_DATE - INTERVAL '3 days';`

---

## 저작권

지도 타일: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, © [CARTO](https://carto.com/attributions)  
지하철 데이터: Kaggle Seoul Subway Geospatial Data (CC0 Public Domain)
