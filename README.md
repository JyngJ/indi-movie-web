# 예술영화관 상영 통합 조회

서울 독립·예술영화관 상영 정보를 한 곳에서 조회하는 모바일 웹 서비스 (MVP).

---

## 빠른 시작

```bash
npm install
npm run dev
# → http://localhost:3000
```

> Node 18+ 필요. 환경 변수는 `.env.local` 참고 (`.env.example` 예정).
> 이 프로젝트는 Turbopack을 사용하지 않습니다. `npm run dev`와 `npm run build`는 Webpack 모드(`--webpack`)로 실행되어야 합니다.

---

## 기술 스택

| 영역 | 도구 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 16 (App Router) | Webpack 사용 (`--webpack`, Turbopack 금지) |
| 언어 | TypeScript | strict 모드 |
| 서버 상태 | TanStack React Query v5 | 캐싱·동기화 |
| 클라이언트 상태 | Zustand v5 | 테마, UI 상태 |
| 스타일 | Tailwind CSS v4 + CSS Variables | 디자인 토큰 기반 |
| 지도 | Leaflet + react-leaflet v5 | Carto Voyager 타일 |
| 데이터베이스 | Supabase PostgreSQL | 극장/영화/상영시간표/지하철역 데이터 |

---

## 프로젝트 구조

```
src/
├── app/                    # 페이지 (Next.js App Router)
│   ├── page.tsx            # 홈 (지도 뷰)
│   └── dev/components/     # 디자인 시스템 쇼케이스 (/dev/components)
│
├── components/
│   ├── primitives/         # 재사용 UI 원자 — 비즈니스 로직 없음
│   │   ├── Button, Chip, Badge, Card
│   │   ├── Input, SearchBar
│   │   ├── FAB (FabRound)
│   │   └── BottomSheet, Skeleton
│   ├── domain/             # 서비스 도메인 컴포넌트
│   │   ├── ShowtimeCell    # 상영 시간 셀
│   │   ├── DateBar         # 날짜/시간 선택 바
│   │   ├── MapPin          # 지도 마커
│   │   ├── PosterThumb     # 영화 포스터
│   │   └── TheaterSheet    # 극장 정보 바텀시트
│   └── map/
│       └── MapView.tsx     # 전체화면 지도 + 검색/지하철 오버레이
│
├── data/
│   └── subway-lines.json   # 지도 지하철 노선 GeoJSON. .geojson import 금지
│
├── hooks/
│   ├── useUserLocation.ts  # Geolocation → 지도 중심 좌표
│   ├── queries/            # React Query read hooks (useTheaters 등, 예정)
│   └── mutations/          # React Query write hooks (예정)
│
├── lib/
│   ├── supabase/           # Supabase browser client + React Query hooks
│   ├── adapters/
│   │   ├── location.ts     # Geolocation API (추후 RN 교체 가능)
│   │   └── storage.ts      # localStorage (추후 AsyncStorage 교체 가능)
│   └── query-client.ts     # React Query 전역 설정
│
├── store/                  # Zustand 스토어 (테마, 유저 등)
├── styles/tokens.css       # CSS Variables 디자인 토큰 (라이트/다크)
└── types/                  # 공유 TypeScript 타입
```

---

## API 계약 (프론트 ↔ 백엔드)

> 상세 스펙: [`docs/API.md`](./docs/API.md)

현재 앱의 주요 읽기 화면은 Supabase React Query hooks로 직접 연결되어 있습니다.
아래 REST 엔드포인트는 장기 API 계약 초안이며, 구현 방식은 기능별로 조정될 수 있습니다.

### 주요 엔드포인트

| 엔드포인트 | 용도 | 캐시 |
|-----------|------|------|
| `GET /api/theaters/search` | 지도 범위 내 극장 목록 (바운딩박스) | 30분 |
| `GET /api/theaters/:id` | 극장 상세 정보 | 1시간 |
| `GET /api/movies/search` | 영화 검색 (KMDB/TMDB) | 30분 |
| `GET /api/movies/trending` | 현재 상영중 / 개봉 예정 | 6시간 |
| `GET /api/showtimes/theater/:id` | 극장별 상영시간표 | 10분 |
| `GET /api/showtimes/movie/:id` | 영화별 상영 극장 | 15분 |
| `POST /api/favorites` | 즐겨찾기 추가 (인증 필요) | — |

**에러 형식 통일:**
```json
{ "error": { "code": "ERR_CODE", "message": "설명" } }
```

### 프론트 React Query Hooks

```ts
useTheaters()                     // 전체 극장 목록
useStations()                     // 지하철역 목록
useMovies()                       // 전체 영화 목록
useActiveMovieIds()               // 오늘 포함 미래 상영 스케줄이 있는 영화 ID
useTheaterShowtimes(theaterId, date)
useFavorites()                    // 즐겨찾기 목록
useToggleFavorite({ type, id })   // 즐겨찾기 토글
```

---

## DB 스키마 (논리 모델)

> 상세 스펙: [`docs/DB.md`](./docs/DB.md)

| 테이블 | 핵심 컬럼 |
|--------|-----------|
| `theaters` | id, name, lat, lng, address, screen_count |
| `movies` | id, title, kmdb_id, kmdb_movie_seq, nation, genre[], poster_url |
| `showtimes` | theater_id, movie_id, show_date, show_time, seat_total, seat_available |
| `stations` | name, lines[], lat, lng, city, district, neighborhood, aliases |
| `areas` | name, type, city, district, lat, lng, aliases |
| `subway_lines` | name, line_code, geometry |
| `users` | id (→ auth), email, preferred_city |
| `favorites` | user_id, item_type ('theater'\|'movie'), item_id |

현재 Supabase 스키마 초안은 `docs/SUPABASE.sql`에 있고, 지하철 테이블만 따로 적용할 때는 `docs/SUPABASE_STATIONS.sql`을 사용할 수 있습니다.

---

## 개발 로드맵

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 프로젝트 초기화, 디자인 토큰, 컴포넌트 시스템 | ✅ 완료 |
| 2 | 지도 뷰, 위치 기반 극장 탐색, 극장 상세, 지하철 오버레이 | ✅ 주요 기능 완료 |
| 3 | 영화/감독 검색, 상영시간표 UI | 🔄 일부 진행 |
| 4 | 사용자 인증, 즐겨찾기 | 예정 |
| 5 | 성능 최적화, Capacitor 앱 확장 준비 | 예정 |

---

## 디자인 시스템

컴포넌트 전체 확인: **http://localhost:3000/dev/components**

- 모든 색상·간격·폰트는 `src/styles/tokens.css`의 CSS Variables로 정의
- 라이트/다크 모드 모두 지원 (`[data-theme="dark"]`)
- 모바일 375px 기준, 터치 타겟 최소 44px
- 자세한 내용: [`docs/DESIGN.md`](./docs/DESIGN.md)

---

## 웹 → 앱 확장 구조

`src/lib/adapters/`의 인터페이스를 교체하는 것만으로 React Native 전환 가능:

| 어댑터 | 웹 | React Native (예정) |
|--------|-----|---------------------|
| `location.ts` | Geolocation API | RN Geolocation |
| `storage.ts` | localStorage | AsyncStorage |

---

## 문서

| 파일 | 내용 |
|------|------|
| [`docs/API.md`](./docs/API.md) | REST API 상세 스펙 & 에러 코드 |
| [`docs/DB.md`](./docs/DB.md) | DB 테이블 스키마 (논리 모델) |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | 디자인 토큰 & 컴포넌트 가이드 |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | 폴더 구조 & Adapter 패턴 |
| [`docs/INFRA.md`](./docs/INFRA.md) | 환경 변수 & 배포 |
| [`docs/WORKFLOW.md`](./docs/WORKFLOW.md) | 브랜치 전략 & Phase 체크리스트 |
| [`CLAUDE.md`](./CLAUDE.md) | AI 코딩 어시스턴트(Claude Code) 설정 |

---

## 지도 데이터 저작권

지도 타일: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, © [CARTO](https://carto.com/attributions)

지하철 노선/역 데이터는 Kaggle Seoul Subway Geospatial Data 계열의 CC0 Public Domain 데이터를 기준으로 정리했습니다. 앱 번들에는 `src/data/subway-lines.json`만 import합니다. Turbopack은 `.geojson` import를 기본 처리하지 않으므로 `@/data/subway-lines.geojson`로 되돌리지 마세요.
