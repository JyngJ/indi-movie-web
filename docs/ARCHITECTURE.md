# 아키텍처

> 예술영화관 상영 통합 조회 서비스 — 코드 구조 & 설계 원칙

---

## 플랫폼 전략

**MVP**: 모바일 웹 (iOS Safari + Android Chrome)  
**확장**: React Native 또는 Capacitor로 앱 패키징

### 원칙

- 브라우저 전용 API(`window`, `localStorage`, `document`)에 직접 의존 금지 → **Adapter 패턴**
- 라우팅은 Next.js App Router 표준만 사용
- 폰트, 아이콘은 가능한 번들 포함 (앱 패키징 시 오프라인 동작 보장)

---

## 폴더 구조

```
src/
├── app/                      # Next.js App Router 페이지
│   ├── layout.tsx            # Root layout (QueryProvider, ThemeProvider)
│   ├── page.tsx              # 홈 (지도 메인)
│   ├── providers.tsx         # React Query Provider
│   ├── theater/[id]/         # 극장 상세
│   ├── movie/[id]/           # 영화 상세
│   ├── search/               # 검색
│   ├── my/                   # 마이 페이지
│   └── auth/                 # 로그인/회원가입
│
├── components/
│   ├── primitives/           # 토큰만 참조, 비즈니스 로직 없음
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Chip.tsx
│   │   ├── Badge.tsx
│   │   └── Skeleton.tsx
│   └── domain/               # Primitive 조합 + 도메인 로직
│       ├── TheaterCard.tsx
│       ├── TheaterPin.tsx
│       ├── MovieCard.tsx
│       ├── ShowtimeCell.tsx
│       └── DatePicker.tsx
│
├── hooks/
│   ├── queries/              # React Query hooks
│   │   ├── useUserLocation.ts
│   │   ├── useTheaters.ts
│   │   ├── useTheater.ts
│   │   ├── useMovies.ts
│   │   ├── useMovie.ts
│   │   ├── useShowtimes.ts
│   │   └── useFavorites.ts
│   ├── mutations/
│   │   └── useToggleFavorite.ts
│   └── ui/
│       ├── useTheme.ts
│       └── useBottomSheet.ts
│
├── lib/
│   ├── api-client.ts         # fetch 추상화 (base URL, headers)
│   ├── query-client.ts       # React Query 클라이언트 설정
│   └── adapters/             # 플랫폼 추상화 레이어
│       ├── location.ts       # Geolocation → React Native 교체 가능
│       └── storage.ts        # localStorage → AsyncStorage 교체 가능
│
├── store/                    # Zustand
│   ├── themeStore.ts         # 다크/라이트 모드
│   ├── uiStore.ts            # 바텀시트, 검색 열림 상태
│   └── userStore.ts          # 로그인 사용자 정보 (Phase 4)
│
├── styles/
│   ├── globals.css           # Reset + base styles
│   └── tokens.css            # CSS 변수 (디자인 토큰)
│
└── types/
    └── api.ts                # 모든 API 응답 TypeScript 타입
```

---

## 데이터 레이어 (3-tier)

```
[UI 컴포넌트]
     ↓ 상태 구독
[React Query / Zustand]
     ↓ 쿼리 함수 호출
[API Hook 레이어]       ← useTheaters, useShowtimes, useMovies
     ↓
[API Client]            ← fetch 추상화, 환경 무관
     ↓
[백엔드 API]
```

### 캐시 전략

| 데이터 | staleTime | gcTime | refetchInterval |
|--------|-----------|--------|-----------------|
| 극장 목록 (지도) | 30분 | 2시간 | — |
| 극장 상세 | 1시간 | 4시간 | — |
| 영화 검색 | 30분 | 1시간 | — |
| 영화 상세 | 2시간 | 6시간 | — |
| 상영시간표 | 10분 | 30분 | 5분 |
| 즐겨찾기 | 1분 | 10분 | — |

---

## Adapter 패턴

웹 → 앱 이전 시 플랫폼별 구현을 교체할 수 있는 인터페이스.

### Location Adapter

```ts
// src/lib/adapters/location.ts
interface ILocationAdapter {
  getCurrentPosition(): Promise<{ lat: number; lng: number }>
  watchPosition(cb: (coords) => void): () => void
  getDefaultLocation(): { lat: number; lng: number }
}

// 현재: Web Geolocation API
// 앱 전환 시: React Native Geolocation 구현체로 교체
export const locationAdapter: ILocationAdapter = webLocationAdapter
```

### Storage Adapter

```ts
// src/lib/adapters/storage.ts
interface IStorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

// 현재: localStorage
// 앱 전환 시: AsyncStorage 구현체로 교체
export const storageAdapter: IStorageAdapter = webStorageAdapter
```

---

## 라우팅

```
/                   홈 (지도 메인)
/theater/[id]       극장 상세
/movie/[id]         영화 상세
/search?q=...       검색 결과
/my                 마이 페이지 (즐겨찾기, 알림)
/auth/login         로그인
/auth/signup        회원가입
```

**원칙**:
- URL = 상태 (새로고침해도 동일 화면)
- 바텀시트, 모달은 modal route 패턴으로 URL 반영

---

## 상태 관리

| 종류 | 도구 | 예시 |
|------|------|------|
| 서버 상태 | React Query | 극장 목록, 상영시간표 |
| UI 상태 | useState / useReducer | 입력값, 로컬 토글 |
| 전역 UI 상태 | Zustand | 테마, 바텀시트, 검색 |

Redux 같은 헤비 라이브러리 도입 금지.

---

## 성능

- 영화 포스터: `next/image` + lazy loading (한 화면에 20+장 가능)
- 지도: `dynamic import`로 코드 스플릿 (Leaflet 무거움)
- 긴 목록: `react-virtual` 가상 스크롤
- 목표: Lighthouse 모바일 90+, 번들 < 500KB, 초기 로드 < 3초

---

## 접근성

- 색상만으로 정보 전달 금지 (배지에 텍스트 병행)
- `prefers-reduced-motion` 존중
- Semantic HTML (`<button>`, `<a>`, `<nav>`)
- 터치 타겟 최소 44px
