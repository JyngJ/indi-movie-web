# SEO 개선 계획

감사일: 2026-06-09  
브랜치: `feat/global-nav` 기준 분석

---

## 현황 요약

| 항목 | theater/[id] | movie/[id] | 비고 |
|------|-------------|------------|------|
| JSON-LD | ✅ MovieTheater (부분) | ❌ 없음 | movie schema 전무 |
| ISR revalidate | ✅ 3600 | ❌ 없음 | |
| generateStaticParams | ✅ | ❌ 없음 | |
| 봇 크롤링 HTML | ✅ 서버 렌더링 | ❌ 클라이언트만 | 치명적 |
| next/image | N/A | ❌ `<img>` 사용 | eslint 무시 중 |
| OG 이미지 크기 명시 | ✅ (opengraph-image.tsx) | ❌ width/height 없음 | |
| 사이트맵 포함 여부 | ✅ | ❌ 없음 | sitemap.ts에 누락 |

---

## 항목별 분석

### 1. Movie JSON-LD 미구현

**파일**: `src/app/movie/[id]/page.tsx`

**현재**: `generateMetadata`만 있고 `<script type="application/ld+json">` 없음.  
Theater는 `toTheaterSchema()` + script 태그 구현 완료. Movie는 없음.

**구현 시 주의점**:

- `generateMetadata`와 page 함수는 Next.js가 독립 호출 → 쿼리가 다르면 DB hit 2회 발생.  
  현재 generateMetadata 쿼리: `title, original_title, poster_url, movie_details(synopsis)`  
  JSON-LD 필요 컬럼: `year, genre, director, nation, rating, movie_details(runtime_minutes)` 추가 필요  
  → **`fetchMovie()` 서버 함수로 분리하고 두 곳에서 공유**

- 타입 변환 필요:

  | DB 필드 | JSON-LD 필드 | 변환 |
  |---------|-------------|------|
  | `year: number` | `datePublished` | `String(year)` |
  | `runtimeMinutes: number` | `duration` | `90` → `"PT90M"` |
  | `director: string[]` | `director` | `[{ "@type": "Person", "name": "..." }]` |
  | `rating: number` | `aggregateRating.ratingValue` | `ratingCount` 없으면 생략 |

- `rating`만 있고 `ratingCount` DB 컬럼 없음 → `aggregateRating` 추가해도 구글 별점 리치스니펫 미노출 가능. 안전하게 생략.

**추가할 파일**: `src/lib/seo/toMovieSchema.ts`

---

### 2. movie/[id] 봇 크롤링 불가 (가장 치명적)

**파일**: `src/app/movie/[id]/page.tsx`, `MovieDetailClient.tsx`

**현재**: page.tsx가 `<MovieDetailClient>` 껍데기만 SSR. 실제 콘텐츠는 클라이언트에서 Supabase 직접 조회.

```
서버 HTML → <div></div> (빈 껍데기)
Googlebot이 JS 미실행 시 → 콘텐츠 0
```

**`revalidate` 추가만으로는 해결 안 됨** — 캐시되는 게 빈 HTML이기 때문.

**근본 해결**:
1. `page.tsx`에서 서버 fetch
2. `MovieDetailClient`에 `initialData` prop 추가
3. `useMovieDetail` hook에 `initialData` 옵션 연결

```ts
// queries.ts의 useMovieDetail에 initialData 옵션 추가
export function useMovieDetail(movieId: string | null, initialData?: MovieDetail) {
  return useQuery<MovieDetail | null>({
    queryKey: ['movie-detail', movieId],
    initialData: initialData ?? undefined,
    ...
  })
}
```

**주의**: hydration mismatch 위험.  
서버에서 내려준 데이터 ≠ 클라이언트 첫 렌더 데이터 되면 React 경고 + UI 깜빡임.  
`initialData`는 서버/클라이언트 동일 쿼리 결과이므로 안전. 단, 날짜/시간 포맷 등 서버/클라이언트 환경 차이 주의.

---

### 3. 사이트맵 두 가지 문제

**파일**: `src/app/sitemap.ts`

**문제 1 — 영화 URL 전무**  
`/movie/[id]` URL이 사이트맵에 없음. 검색엔진이 링크 크롤링 없이는 영화 페이지 미발견.

**문제 2 — 확장성 없음**  
단일 `select('id')` 전체 조회. 50,000개 초과 시 사이트맵 파일 크기 제한 위반.

**해결**: `generateSitemaps()` + 세분화

```
src/app/sitemap.ts           ← 루트 + theater URL (소량)
src/app/movie/sitemap.ts     ← generateSitemaps()로 페이지네이션
```

Next.js가 자동으로 `/movie/sitemap/0.xml`, `/movie/sitemap/1.xml` 생성 + index.

**추가 버그**: `lastModified: new Date()` — 빌드마다 전체 갱신된 것처럼 보임.  
→ DB의 `updated_at` 컬럼 있으면 사용, 없으면 `undefined`.

**`revalidate` 필요**: 없으면 정적 생성 1회. 새 영화 추가 시 미반영.  
→ `export const revalidate = 86400` (1일) 권장.

---

### 4. next/image 미사용

**파일**: `src/app/movie/[id]/MovieDetailClient.tsx` (HeroSection, line 141)

**현재**:
```tsx
// eslint-disable-next-line @next/next/no-img-element  ← 경고 무시 중
<img src={movie.posterUrl} alt="" style={{ width: posterW, height: posterH, objectFit: 'cover' }} />
```

**next/image 전환 선행 조건**: `next.config.ts`에 `remotePatterns` 없으면 런타임 에러:
```
Error: Invalid src prop on `next/image`, hostname "pkmgloiixwvhitqpcfyc.supabase.co" 
is not configured under `images.remotePatterns`
```

**추가할 remotePatterns**:
```ts
// next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'pkmgloiixwvhitqpcfyc.supabase.co',
      pathname: '/storage/**',
    },
  ],
}
```

**전환 방법**: 부모 div가 `position: relative` + 명시적 크기 → `fill` 모드 적합.

```tsx
<Image
  src={movie.posterUrl}
  alt={`${movie.title} 포스터`}
  fill
  style={{ objectFit: 'cover', borderRadius: ... }}
  sizes="(min-width: 1024px) 220px, 96px"
  priority  // hero = LCP 대상
/>
```

**`sizes` 없으면** Next.js가 100vw로 추정 → 불필요하게 큰 이미지 다운로드.  
**`alt=""`** 현재 빈 문자열 → SEO 손실. 영화 제목으로 변경.  
**클라이언트 컴포넌트에서도 작동** — `'use client'` 환경 무관.

---

### 5. OG 이미지 비율 문제

**파일**: `src/app/movie/[id]/page.tsx` (generateMetadata)

**현재**:
```ts
images: [{ url: data.poster_url }]  // width/height 없음
```

**문제**: 영화 포스터 비율 ≈ 2:3 (세로). SNS 기대 비율 = 1.91:1 (1200×630 가로).  
→ Facebook, Kakao가 이미지 크롭하거나 무시.

**해결**: Theater처럼 `opengraph-image.tsx` 동적 생성.  
포스터를 왼쪽에, 제목/감독/장르 텍스트를 오른쪽에 배치한 1200×630 이미지.

**추가할 파일**: `src/app/movie/[id]/opengraph-image.tsx`

포스터 URL이 외부 URL이므로 `ImageResponse` 내부 `<img src>` 직접 사용 가능 (Next.js OG가 자동 fetch).

**추가 버그 (layout.tsx)**:
```ts
images: [{ url: '/squarelogo.svg', width: 351, height: 351 }]
```
SVG를 OG 이미지로 사용 → Facebook, Kakao 미지원. PNG 버전 필요 (별도 asset 작업).

---

## 구현 순서

```
1. next.config.ts
   remotePatterns 추가 (다른 모든 항목 선행 조건)

2. src/lib/seo/toMovieSchema.ts
   toMovieSchema() 함수 신규 작성

3. src/app/movie/[id]/page.tsx
   - fetchMovie() 서버 함수 분리
   - revalidate + generateStaticParams 추가
   - JSON-LD script 태그 추가
   - MovieDetailClient에 initialData prop 전달

4. src/lib/supabase/queries.ts
   useMovieDetail에 initialData 옵션 추가

5. src/app/movie/[id]/MovieDetailClient.tsx
   - next/image 전환 (HeroSection)
   - alt 속성 추가

6. src/app/movie/[id]/opengraph-image.tsx
   신규 파일 (1200×630 동적 OG 이미지)

7. src/app/sitemap.ts → src/app/movie/sitemap.ts
   movies URL 추가 + generateSitemaps 페이지네이션

8. public/squarelogo.png
   SVG → PNG 변환 (OG fallback용, asset 작업)
```

---

## 위험도

| 항목 | 위험도 | 이유 |
|------|--------|------|
| remotePatterns | 낮음 | config 추가만 |
| toMovieSchema | 낮음 | 신규 파일, 기존 코드 무영향 |
| JSON-LD + revalidate | 낮음 | script 태그 추가 + export const |
| initialData 연결 | **중간** | hydration mismatch 가능성 |
| next/image 전환 | 낮음 | remotePatterns 선행 필수 |
| opengraph-image.tsx | 낮음 | 신규 파일 |
| sitemap 분리 | 낮음 | 기존 sitemap.ts 보존 가능 |
