# 작업 흐름

> Phase별 개발 진행 가이드 & 브랜치 전략

---

## 브랜치 전략

```
main         ← 프로덕션 (안정)
  └─ develop ← 개발 통합 브랜치
       ├─ feature/phase-1-init
       ├─ feature/phase-2-map
       ├─ feature/phase-3-movie
       ├─ feature/phase-4-auth
       └─ docs/xxx
```

### 규칙

- `main` 직접 push 금지 — PR + 리뷰 후 머지
- feature 브랜치 → `develop` 머지 → QA → `main` 머지
- 브랜치 네이밍: `feature/기능명`, `fix/버그명`, `docs/문서명`
- 커밋 컨벤션 (Conventional Commits)
  - `feat:` 새 기능
  - `fix:` 버그 수정
  - `refactor:` 코드 개선
  - `style:` 스타일 변경
  - `docs:` 문서 수정
  - `chore:` 설정, 의존성

---

## VS Code 실시간 확인 설정

```
┌─────────────────────┬──────────────────────┐
│  Explorer + 코드    │  Terminal            │
│  (파일 변경 확인)   │  npm run dev         │
│                     │                      │
│  Phase 2 이후:      │  브라우저 (별도 창)  │
│  파일 트리 확인     │  localhost:3000      │
└─────────────────────┴──────────────────────┘
```

---

## Phase 1: 초기화 ✅ 완료

**브랜치**: `main` (직접 커밋)

**완료 항목**:
- [x] Next.js 14 App Router + TypeScript + Tailwind
- [x] 디자인 토큰 CSS 변수 (`src/styles/tokens.css`)
- [x] Location Adapter (`src/lib/adapters/location.ts`)
- [x] Storage Adapter (`src/lib/adapters/storage.ts`)
- [x] React Query Provider + query-client
- [x] Zustand: themeStore, uiStore
- [x] FOUC 방지 테마 초기화
- [x] Safe area, 100dvh, 터치 타겟 44px
- [x] TypeScript 타입 정의 (`src/types/api.ts`)

---

## Phase 2: 극장/지도 기능

**브랜치**: `feature/phase-2-map`

**시작 방법**:
```bash
git checkout main
git pull
git checkout -b feature/phase-2-map
```

**체크리스트**:
- [x] `useUserLocation` Hook — Location Adapter 연결
- [x] `useTheaters()` Hook — Supabase 연결
- [x] `useStations()` Hook — Supabase 연결
- [x] `useMovies()` Hook — Supabase 연결
- [x] `useActiveMovieIds()` Hook — 오늘 포함 미래 상영 스케줄 기준
- [ ] `useTheater(id)` Hook
- [ ] `useTheaterSearch(query)` Hook
- [x] 지도 컴포넌트 (`src/components/map/MapView.tsx`) — Leaflet/react-leaflet
- [x] 지도에 현재 위치 이동
- [x] 지도에 극장 마커 표시
- [x] 극장 바텀시트 Domain 컴포넌트
- [x] 홈 페이지 (`/`) — 지도 메인
- [ ] 극장 상세 페이지 (`/theater/:id`)
- [ ] 극장 검색 기능
- [x] 동일 건물 클러스터 분리
- [x] 클러스터 라벨/포스터 겹침 완화
- [x] 지하철 노선 오버레이
- [x] 지하철역 핀/라벨 표시
- [x] 지하철역 검색 및 선택 시 지도 이동
- [x] 영화/감독 검색 결과 표시
- [x] 상영중 영화 태그 표시

**완료 후**:
```bash
git commit -m "feat: Phase 2 - 극장/지도 기능"
git push
```

**검증**:
- [x] 지도에 마커 표시 확인
- [x] 위치 권한 거부 시 서울 시청 fallback
- [x] TypeScript 컴파일: `npm run build`
- [ ] 모바일 375px 렌더링 확인

현재 앱 `tsconfig.json`은 `pipeline`을 제외하며, `npm run build`는 Webpack 모드로 앱 빌드와 TypeScript 검증을 통과한다.

---

## Phase 3: 영화/상영시간표

**브랜치**: `feature/phase-3-movie`

**체크리스트**:
- [ ] KMDB/TMDB 통합 정규화 레이어 (`src/lib/movie-api.ts`)
- [x] `useMovies()` Hook
- [ ] `useMovie(id)` Hook
- [ ] `useTrendingMovies(type)` Hook
- [x] `useTheaterShowtimes(theaterId, date)` Hook
- [ ] `useTheatersByMovie(movieId, date)` Hook
- [ ] 영화 카드 컴포넌트 (`MovieCard`)
- [x] 상영시간표 셀 컴포넌트 (`ShowtimeCell`)
- [x] 날짜/필터 선택 UI (`FilterBar`, `DateBar`)
- [x] 지도 검색 오버레이 안의 영화/감독 검색 결과
- [ ] 독립 영화 검색 페이지 (`/search`)
- [ ] 영화 상세 페이지 (`/movie/:id`)
- [ ] 홈 개선: "가까운 극장", "지금 상영중", "곧 개봉"

---

## Phase 4: 사용자 기능

**브랜치**: `feature/phase-4-auth`

**체크리스트**:
- [ ] Auth 연동 (Supabase or 자체 서버 — TBD)
- [ ] `userStore` 구현 (`src/store/userStore.ts`)
- [ ] 로그인 페이지 (`/auth/login`)
- [ ] 회원가입 페이지 (`/auth/signup`)
- [ ] `useFavorites()` Hook
- [ ] `useToggleFavorite()` Mutation
- [ ] 마이 페이지 (`/my`)
- [ ] 즐겨찾기 버튼 (극장/영화 상세)

---

## Phase 5: 성능 최적화

**브랜치**: `feature/phase-5-optimize`

**체크리스트**:
- [ ] `next/image` 최적화 적용
- [ ] Leaflet dynamic import 확인
- [ ] `react-virtual` 가상 스크롤 (긴 목록)
- [ ] `@next/bundle-analyzer` 번들 분석
- [ ] Lighthouse 모바일 90+ 달성
- [ ] Capacitor 설정 파일 준비 (앱 확장 대비)

---

## 명령어 모음

> Next.js 명령은 Turbopack을 쓰지 않습니다. `package.json`의 `dev`/`build` 스크립트는 반드시 `--webpack` 플래그를 유지하세요.

```bash
# 개발 서버
npm run dev

# 타입 체크
npx tsc --noEmit

# 프로덕션 빌드 (에러 확인용)
npm run build

# 번들 분석 (설치 필요: npm install @next/bundle-analyzer)
npm run analyze

# Git
git log --oneline --graph    # 브랜치 히스토리
git stash                    # 임시 저장
git stash pop                # 복구
```
