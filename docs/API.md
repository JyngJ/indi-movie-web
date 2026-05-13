# API 스펙

> 예술영화관 상영 통합 조회 서비스 — REST API 정의서

**⚠️ TBD**: 백엔드 구현 방식 결정 전이므로, 아래는 **엔드포인트 인터페이스 계약**입니다.  
구현체는 Supabase RPC, Express, FastAPI 등 백엔드 선택 후 작성합니다.

---

## 에러 표준 형식

모든 에러 응답:
```json
{ "error": { "code": "ERR_CODE", "message": "설명 메시지" } }
```

---

## 극장 (Theaters)

### `GET /api/theaters/search`
지도 바운딩박스 범위 내 극장 목록

**쿼리 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `minLat` | number | ✓ | 남쪽 위도 |
| `minLng` | number | ✓ | 서쪽 경도 |
| `maxLat` | number | ✓ | 북쪽 위도 |
| `maxLng` | number | ✓ | 동쪽 경도 |
| `limit` | number | | 기본 50 |
| `offset` | number | | 기본 0 |

**응답**
```ts
{
  theaters: Theater[]
  total: number
}
```

**캐시**: staleTime 30분, gcTime 2시간

---

### `GET /api/theaters/:id`
극장 상세 정보

**응답**
```ts
{
  id: string
  name: string
  lat: number
  lng: number
  address: string
  city: string
  phone?: string
  website?: string
  screenCount: number
  seatCount?: number
  amenities: {
    parking: boolean
    restaurant: boolean
    accessibility: boolean
  }
  rating?: number
  operatingHours: Array<{
    dayOfWeek: number   // 0=일, 1=월 ... 6=토
    open: string        // "10:00"
    close: string       // "23:00"
  }>
  createdAt: string
  updatedAt: string
}
```

**캐시**: staleTime 1시간

---

### `GET /api/theaters/search/name`
극장명 검색

**쿼리**: `q` (검색어), `limit` (기본 20)  
**캐시**: staleTime 10분

---

## 영화 (Movies)

### `GET /api/movies/search`
영화 검색 (KMDB + TMDB 통합 응답)

**쿼리 파라미터**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `q` | string | 검색어 (최소 2자) |
| `year` | number | 개봉연도 필터 |
| `limit` | number | 기본 20 |

**응답**
```ts
{
  movies: Array<{
    id: string
    title: string
    originalTitle?: string
    year: number
    posterUrl?: string
    genre: string[]
    director: string[]
    nation?: string
    synopsis?: string
    runtimeMinutes?: number
    certification?: string   // "전체", "12세", "15세", "청불"
    kmdbId?: string
    tmdbId?: number
    rating?: number
  }>
}
```

**캐시**: staleTime 30분

---

### `GET /api/movies/:id`
영화 상세  
**캐시**: staleTime 2시간

---

### `GET /api/movies/trending`
현재/예정 영화

**쿼리**: `type` (`current` | `upcoming`), `limit` (기본 30)  
**캐시**: staleTime 6시간

---

## 상영시간표 (Showtimes)

### `GET /api/showtimes/theater/:theaterId`
극장별 상영시간표

**쿼리 파라미터**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `date` | string | ISO 8601 (예: `2026-05-01`) |
| `movieId` | string | 특정 영화 필터 (optional) |
| `dateRange` | number | 조회 기간, 기본 7일 |

**응답**
```ts
{
  showtimes: Array<{
    id: string
    movieId: string
    movieTitle: string
    screenName: string
    showDate: string          // "2026-05-01"
    showTime: string          // "14:30"
    endTime?: string          // "16:30"
    formatType: 'standard' | '2k' | '4k' | 'imax' | 'dolby'
    language: 'korean' | 'english' | 'original'
    seatAvailable: number
    seatTotal: number
    price: number             // 원 단위
    bookingUrl?: string
  }>
}
```

**캐시**: staleTime 10분, refetchInterval 5분

---

### `GET /api/showtimes/movie/:movieId`
영화별 상영 극장 목록

**쿼리**: `date`, `city` (optional), `dateRange` (기본 7)  
**캐시**: staleTime 15분

---

## 즐겨찾기 (Favorites) — 인증 필수

### `POST /api/favorites`
즐겨찾기 추가

**요청 바디**
```ts
{ type: 'theater' | 'movie', itemId: string, notes?: string }
```

**응답**: `{ id, type, itemId, createdAt }`

---

### `GET /api/favorites`
즐겨찾기 목록  
**캐시**: staleTime 1분

---

### `DELETE /api/favorites/:id`
즐겨찾기 삭제 — 응답: `204 No Content`

---

## 프론트엔드 Hooks 매핑

```ts
// Location
useUserLocation()                              → 위치 감지 (Geolocation Adapter)

// Theater
useTheaters(bounds: MapBounds)                 → GET /api/theaters/search
useTheater(id: string)                         → GET /api/theaters/:id
useTheaterSearch(query: string)                → GET /api/theaters/search/name

// Movie
useMovies(query: string)                       → GET /api/movies/search
useMovie(id: string)                           → GET /api/movies/:id
useTrendingMovies(type)                        → GET /api/movies/trending

// Showtime
useShowtimes(theaterId, date)                  → GET /api/showtimes/theater/:id
useTheatersByMovie(movieId, date)              → GET /api/showtimes/movie/:id

// Favorites
useFavorites()                                 → GET /api/favorites
useToggleFavorite()                            → POST/DELETE /api/favorites
```
