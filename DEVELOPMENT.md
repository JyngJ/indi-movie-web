# 상세 개발 계획서

> 예술영화관 상영 통합 조회 웹서비스 (MVP) - Version 0.1

**작성일**: 2026-05-01  
**상태**: 🟡 Phase 1 준비 중

---

## 📋 목차

1. [API 스펙](#1-api-스펙)
2. [프론트엔드 API Hooks](#2-프론트엔드-api-hooks)
3. [DB 스키마](#3-db-스키마)
4. [구현 기능 체크리스트](#4-구현-기능-체크리스트)
5. [디자인 토큰 시스템](#5-디자인-토큰-시스템)
6. [마이그레이션 전략](#6-웹--앱-마이그레이션-구조)

---

## 1. API 스펙

### ⚠️ TBD (백엔드 팀과 협의 필수)
- [ ] DB 선택: Supabase vs 자체 MySQL/PostgreSQL/MongoDB?
- [ ] 백엔드 서버: Node.js/Express vs Python/FastAPI vs Java/Spring?
- [ ] API 구현: REST vs GraphQL?
- [ ] 외부 API 연동: KMDB/TMDB 프론트에서 vs 백엔드에서?

**아래 스펙은 REST 기준이며, 선택 후 구현합니다.**

---

### 1.1 극장 관련 엔드포인트

#### GET /api/theaters/search
**설명**: 지도 범위 내 극장 조회 (바운딩박스 기반)

| 항목 | 값 |
|------|-----|
| 메서드 | GET |
| 쿼리 | `minLat`, `minLng`, `maxLat`, `maxLng`, `limit`, `offset` |
| 응답 | `{ theaters: Theater[], total: number }` |
| 캐시 | staleTime 30분, gcTime 2시간 |
| 에러 | 400 (범위 오류), 500 (서버) |

```json
{
  "theaters": [
    {
      "id": "uuid",
      "name": "극장명",
      "lat": 37.5665,
      "lng": 126.9780,
      "address": "서울시 중구 ...",
      "city": "서울",
      "phone": "02-1234-5678",
      "website": "https://...",
      "screenCount": 3,
      "seatCount": 500,
      "amenities": {
        "parking": true,
        "restaurant": false,
        "accessibility": true
      },
      "rating": 4.5,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 42
}
```

---

#### GET /api/theaters/:id
**설명**: 특정 극장 상세정보

| 항목 | 값 |
|------|-----|
| 메서드 | GET |
| 응답 | `Theater + screenCount, operatingHours` |
| 캐시 | staleTime 1시간 |

---

#### GET /api/theaters/search/name
**설명**: 극장명으로 검색

| 항목 | 값 |
|------|-----|
| 쿼리 | `q` (검색어), `limit` |
| 캐시 | staleTime 10분 |

---

### 1.2 영화 관련 엔드포인트

#### GET /api/movies/search
**설명**: 영화 검색 (KMDB/TMDB 통합)

```json
{
  "movies": [
    {
      "id": "uuid",
      "title": "영화제목",
      "originalTitle": "Original Title",
      "year": 2026,
      "posterUrl": "https://...",
      "genre": ["드라마", "스릴러"],
      "director": ["감독명"],
      "synopsis": "줄거리...",
      "runtimeMinutes": 120,
      "certification": "15세",
      "kmdbId": "kmdb-id",
      "tmdbId": 12345,
      "rating": 8.5
    }
  ]
}
```

**캐시**: staleTime 30분

---

#### GET /api/movies/trending
**설명**: 현재/예정 영화

| 쿼리 | `type` (current/upcoming), `limit` |
|------|------|
| 캐시 | staleTime 6시간 |

---

### 1.3 상영시간표 관련 엔드포인트

#### GET /api/showtimes/theater/:theaterId
**설명**: 극장별 상영시간표

```json
{
  "showtimes": [
    {
      "id": "uuid",
      "movieId": "uuid",
      "movieTitle": "영화제목",
      "screenName": "1관",
      "showTime": "14:30",
      "endTime": "16:30",
      "formatType": "standard", // standard|2k|4k|imax|dolby
      "language": "korean", // korean|english|original
      "seatAvailable": 45,
      "seatTotal": 100,
      "price": 13000,
      "date": "2026-05-01"
    }
  ]
}
```

**쿼리**: `date`, `movieId` (optional), `dateRange` (기본 7)  
**캐시**: staleTime 10분, 백그라운드 갱신 5분

---

#### GET /api/showtimes/movie/:movieId
**설명**: 영화별 상영 극장 목록

**쿼리**: `date`, `city` (optional), `dateRange`  
**캐시**: staleTime 15분

---

### 1.4 사용자 기능 (인증 필수)

#### POST /api/favorites
**설명**: 즐겨찾기 추가

```json
{
  "type": "theater", // theater|movie
  "itemId": "uuid",
  "notes": "선택사항"
}
```

**응답**: `{ id, type, itemId, createdAt }`

---

#### GET /api/favorites
**설명**: 즐겨찾기 목록

**캐시**: staleTime 1분

---

#### DELETE /api/favorites/:id
**응답**: 204 No Content

---

### 1.5 에러 표준화

```json
{
  "error": {
    "code": "ERR_INVALID_BOUNDS",
    "message": "좌표 범위가 유효하지 않습니다"
  }
}
```

---

## 2. 프론트엔드 API Hooks

모든 hook은 `src/hooks/queries/` 또는 `src/hooks/mutations/`에 위치.

### Query Hooks

```typescript
// Location
useUserLocation() 
  → { lat: number, lng: number, isLoading, error }

// Theater
useTheaters(bounds) 
  → { data: Theater[], isLoading, error }
useTheater(theaterId) 
  → { data: Theater, isLoading, error }
useTheaterSearch(query) 
  → { data: Theater[], isLoading, error }
useTheatersByDistance(lat, lng, radius=5) 
  → { data: Theater[], isLoading, error }

// Movie
useMovies(query) 
  → { data: Movie[], isLoading, error }
useMovie(movieId) 
  → { data: Movie, isLoading, error }
useTrendingMovies(type: 'current'|'upcoming') 
  → { data: Movie[], isLoading, error }

// Showtime
useShowtimes(theaterId, date) 
  → { data: Showtime[], isLoading, error }
useTheatersByMovie(movieId, date) 
  → { data: Showtime[], isLoading, error }

// User
useFavorites() 
  → { data: Favorite[], isLoading, error }
useIsTheaterFavorited(theaterId) 
  → boolean
useIsMovieFavorited(movieId) 
  → boolean
```

### Mutation Hooks

```typescript
useToggleFavorite() 
  → { mutate: ({ type, itemId }) => void, isPending, error }
```

---

## 3. DB 스키마

### ⚠️ 주의
아래는 **논리적 데이터 모델**입니다.

- **Supabase 선택**: PostgreSQL SQL 스크립트로 직접 실행
- **자체 MySQL**: MySQL 문법으로 변환
- **MongoDB**: 컬렉션 구조로 재설계

**구현 선택 후 백엔드 팀이 실제 마이그레이션 작성.**

---

### Core Tables

#### theaters (극장)

| 컬럼 | 타입 | 제약 | 인덱스 |
|------|------|------|--------|
| id | UUID | PK | ✓ |
| name | VARCHAR(255) | NOT NULL | ✓ |
| lat | NUMERIC(10,8) | NOT NULL | |
| lng | NUMERIC(10,8) | NOT NULL | |
| address | VARCHAR(500) | NOT NULL | |
| city | VARCHAR(50) | NOT NULL | ✓ |
| phone | VARCHAR(20) | | |
| website | VARCHAR(500) | | |
| screen_count | INTEGER | DEFAULT 0 | |
| seat_count | INTEGER | | |
| parking | BOOLEAN | DEFAULT false | |
| restaurant | BOOLEAN | DEFAULT false | |
| accessibility | BOOLEAN | DEFAULT false | |
| rating | NUMERIC(3,2) | | |
| created_at | TIMESTAMP | DEFAULT NOW() | ✓ |
| updated_at | TIMESTAMP | DEFAULT NOW() | ✓ |

**RLS**: 모든 사용자 SELECT 허용, 관리자만 CUD

---

#### movies (영화)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK |
| title | VARCHAR(500) | NOT NULL |
| original_title | VARCHAR(500) | |
| year | INTEGER | NOT NULL |
| kmdb_id | VARCHAR(50) | UNIQUE |
| tmdb_id | INTEGER | UNIQUE |
| poster_url | VARCHAR(500) | |
| genre | TEXT[] | |
| director | TEXT[] | |
| synopsis | TEXT | |
| runtime_minutes | INTEGER | |
| certification | VARCHAR(10) | |
| rating | NUMERIC(3,2) | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

#### showtimes (상영시간표)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK |
| theater_id | UUID | NOT NULL, FK |
| movie_id | UUID | NOT NULL, FK |
| screen_name | VARCHAR(100) | NOT NULL |
| show_date | DATE | NOT NULL |
| show_time | TIME | NOT NULL |
| end_time | TIME | |
| format_type | VARCHAR(50) | DEFAULT 'standard' |
| language | VARCHAR(50) | DEFAULT 'korean' |
| seat_total | INTEGER | NOT NULL |
| seat_available | INTEGER | NOT NULL |
| price | INTEGER | NOT NULL |
| booking_url | VARCHAR(500) | |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

#### favorites (즐겨찾기)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK |
| user_id | UUID | NOT NULL, FK |
| item_type | VARCHAR(50) | NOT NULL |
| item_id | UUID | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

**UNIQUE**: `(user_id, item_type, item_id)`  
**RLS**: 사용자는 자신의 즐겨찾기만 접근

---

#### notifications (알림, Phase 4+)

| 컬럼 | 타입 |
|------|------|
| id | UUID |
| user_id | UUID |
| type | VARCHAR(50) |
| title | VARCHAR(255) |
| content | TEXT |
| related_theater_id | UUID |
| related_movie_id | UUID |
| is_read | BOOLEAN |
| created_at | TIMESTAMP |

---

## 4. 구현 기능 체크리스트

### Phase 1: 초기화 & 기본 설정
- [ ] 백엔드 팀과 DB/API 선택 협의
- [ ] 환경 파일 설정
- [ ] Next.js 프로젝트 초기화
- [ ] 의존성 설치
- [ ] 폴더 구조 생성
- [ ] 디자인 토큰 CSS 정의
- [ ] 기본 레이아웃 구성

### Phase 2: 극장/지도 기능 ⭐
- [ ] `useTheaters`, `useTheater`, `useTheaterSearch` Hooks
- [ ] **Location Adapter** (Geolocation API)
- [ ] 지도 컴포넌트 (Leaflet)
- [ ] 극장 목록 페이지
- [ ] 극장 상세 페이지
- [ ] 위치 기반 거리순 정렬

### Phase 3: 영화/상영시간표
- [ ] KMDB/TMDB 통합 레이어
- [ ] `useMovies`, `useShowtimes`, `useTheatersByMovie` Hooks
- [ ] 영화 검색 페이지
- [ ] 영화 상세 페이지
- [ ] 상영시간표 UI
- [ ] 홈페이지: "가까운 극장", "지금 상영중", "곧 개봉"

### Phase 4: 사용자 기능
- [ ] Auth 연동
- [ ] 로그인/회원가입
- [ ] `useFavorites`, `useToggleFavorite` Hooks
- [ ] 마이 페이지
- [ ] 즐겨찾기 기능

### Phase 5: 성능 최적화
- [ ] 이미지 최적화
- [ ] 번들 크기 최적화
- [ ] Virtual scrolling
- [ ] Adapter 패턴 완성
- [ ] Lighthouse 90+

---

## 5. 디자인 토큰 시스템

### 파일: src/styles/tokens.css

**라이트 모드**:
```css
:root {
  --color-primary-base: #2C3E50;
  --color-text-primary: #1A1A1A;
  --color-border: #E0E0E0;
  --spacing-sm: 8px;
  --spacing-md: 16px;
}
```

**다크 모드**:
```css
[data-theme="dark"] {
  --color-primary-base: #ECF0F1;
  --color-text-primary: #FFFFFF;
  --color-border: #444444;
}
```

### 폰트
- 본문: `Pretendard` (sans-serif)
- 제목: `RIDIBatang` or `Libre Baskerville` (serif)

### 레이아웃
- 모바일: 375px
- 데스크톱: max-width 480px 중앙 정렬
- Safe area: `env(safe-area-inset-bottom)`

---

## 6. 웹 → 앱 마이그레이션 구조

### Adapter 패턴

**src/adapters/storage.ts**:
```typescript
interface IStorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

// Web: localStorage
// React Native: AsyncStorage (나중)
```

**src/adapters/location.ts**:
```typescript
interface ILocationAdapter {
  getCurrentPosition(): Promise<{lat: number, lng: number}>
  getDefaultLocation(): {lat: number, lng: number}
}

// Web: Geolocation API, 기본값 서울 (37.5665, 126.9780)
// React Native: React Native Geolocation (나중)
```

---

## 폴더 구조

```
src/
├── app/                  # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   ├── theater/[id]/
│   ├── movie/[id]/
│   ├── search/
│   ├── my/
│   └── auth/
├── components/
│   ├── primitives/       # Button, Input, Card
│   └── domain/           # MovieCard, TheaterPin
├── hooks/
│   ├── queries/          # useTheaters, useMovies
│   └── mutations/        # useToggleFavorite
├── lib/
│   ├── api-client.ts
│   └── adapters/         # storage, location
├── store/                # Zustand
│   ├── themeStore.ts
│   └── userStore.ts
├── styles/
│   ├── globals.css
│   └── tokens.css
└── types/
    └── api.ts
```

---

**마지막 업데이트**: 2026-05-01  
**다음**: [WORKFLOW.md](./WORKFLOW.md)에서 Phase별 상세 작업 확인
