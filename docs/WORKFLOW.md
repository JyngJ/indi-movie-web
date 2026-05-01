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

**브랜치**: `feature/phase-2-map` (develop에서 분기)

**시작 방법**:
```bash
git checkout develop
git checkout -b feature/phase-2-map
```

**체크리스트**:
- [ ] `useUserLocation` Hook — Location Adapter 연결
- [ ] `useTheaters(bounds)` Hook — API 연결 (백엔드 준비 전까지 Mock)
- [ ] `useTheater(id)` Hook
- [ ] `useTheaterSearch(query)` Hook
- [ ] 지도 컴포넌트 (`src/components/map/Map.tsx`) — Leaflet dynamic import
- [ ] 지도에 현재 위치 마커
- [ ] 지도에 극장 마커 표시
- [ ] 극장 카드 Primitive + Domain 컴포넌트
- [ ] 홈 페이지 (`/`) — 지도 + 극장 목록
- [ ] 극장 상세 페이지 (`/theater/:id`)
- [ ] 극장 검색 기능

**완료 후**:
```bash
git commit -m "feat: Phase 2 - 극장/지도 기능"
git checkout develop
git merge feature/phase-2-map
```

**검증**:
- [ ] 지도에 마커 표시 확인
- [ ] 위치 권한 거부 시 서울 시청으로 fallback
- [ ] TypeScript 컴파일: `npm run build`
- [ ] 모바일 375px 렌더링 확인

---

## Phase 3: 영화/상영시간표

**브랜치**: `feature/phase-3-movie`

**체크리스트**:
- [ ] KMDB/TMDB 통합 정규화 레이어 (`src/lib/movie-api.ts`)
- [ ] `useMovies(query)` Hook
- [ ] `useMovie(id)` Hook
- [ ] `useTrendingMovies(type)` Hook
- [ ] `useShowtimes(theaterId, date)` Hook
- [ ] `useTheatersByMovie(movieId, date)` Hook
- [ ] 영화 카드 컴포넌트 (`MovieCard`)
- [ ] 상영시간표 셀 컴포넌트 (`ShowtimeCell`)
- [ ] 날짜 선택 컴포넌트 (`DatePicker`)
- [ ] 영화 검색 페이지 (`/search`)
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
