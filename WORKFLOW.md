# Phase별 작업 흐름

> VS Code에서 실시간 확인하며 진행하는 가이드

---

## 🚀 시작 전 준비

### 1단계: VS Code 열기
```bash
code /Users/jungjaeyong/Documents/JyngJ/side/movie
```

### 2단계: 확인할 문서들
- 📄 **README.md** - 프로젝트 개요
- 📋 **CLAUDE.md** - 작업 컨텍스트 (현재)
- 📖 **DEVELOPMENT.md** - 상세 계획
- 🔄 **WORKFLOW.md** - 이 문서

### 3단계: 터미널 준비
```bash
# VS Code 터미널 열기 (Ctrl+`)
# 이곳에서 npm 명령어 실행 가능
```

---

## 📊 전체 작업 흐름

```
┌─────────────────────────────────────────────────────────┐
│  VS Code 좌측: 파일 변경 실시간 확인                   │
│  VS Code 하단: 터미널 (npm run dev, 에러 확인)         │
│  분리 창: 브라우저 localhost:3000 (Phase 2부터)        │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1️⃣: 초기화 & 기본 설정

**📅 예상 시간**: 1-2시간  
**상태**: 🟡 준비 중

### 1.1 백엔드 팀과 협의 ⚠️

먼저 백엔드 팀과 다음을 확정합니다:

```checklist
□ DB 선택: Supabase? 자체 MySQL? MongoDB?
□ 백엔드 서버: Node.js/Express? Python? Java?
□ API 기본 URL (예: http://localhost:3001)
□ 필수 API Key: KMDB, TMDB, Google Maps
□ Auth 구현: Supabase Auth? JWT? Session?
```

**협의 결과 정리**: `.env.local` 파일에 작성 예정

---

### 1.2 Next.js 프로젝트 초기화

```bash
# 터미널에서 실행
npm create next-app@latest .

# 선택사항:
# ✓ TypeScript: Yes
# ✓ ESLint: Yes
# ✓ Tailwind CSS: Yes
# ✓ App Router: Yes (src 디렉토리 사용)
```

**VS Code에서 확인**:
- 좌측 파일 트리에 `src/`, `package.json` 등이 생성됨
- `node_modules/` 폴더 생성 (용량 크므로 주의)

---

### 1.3 의존성 설치

```bash
npm install @tanstack/react-query zustand @supabase/supabase-js leaflet react-leaflet
```

**선택사항** (백엔드 선택에 따라):
```bash
# Supabase 선택 시
npm install @supabase/supabase-js

# 자체 서버 선택 시
npm install axios  # 또는 fetch 사용

# 지도 대신 Google Maps 선택 시
npm install @react-google-maps/api
```

**VS Code**: `package.json`의 dependencies 항목이 업데이트됨

---

### 1.4 폴더 구조 생성

```bash
# 터미널에서 (또는 VS Code Explorer)
mkdir -p src/{components/primitives,components/domain,hooks/queries,hooks/mutations,lib/adapters,store,styles,types}
```

**VS Code 확인**: 좌측 파일 트리에 폴더 구조 표시

---

### 1.5 환경 변수 설정

**파일**: `.env.local` (git ignore됨)

```env
# Supabase (선택 시)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# 외부 API
NEXT_PUBLIC_KMDB_API_KEY=your-key
NEXT_PUBLIC_TMDB_API_KEY=your-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key

# 개발 환경
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

**파일**: `.env.example` (git 추적)

```env
# 커밋 가능, 실제 키 없는 템플릿
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_KMDB_API_KEY=
NEXT_PUBLIC_TMDB_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

### 1.6 디자인 토큰 정의

**파일**: `src/styles/tokens.css`

```css
/* Root - Light Mode */
:root {
  /* Colors */
  --color-primary-base: #2C3E50;
  --color-primary-light: #34495E;
  --color-surface-card-light: #FFFFFF;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #666666;
  --color-border: #E0E0E0;
  --color-success: #27AE60;
  --color-warning: #F39C12;
  --color-error: #E74C3C;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Typography */
  --font-sans: 'Pretendard', sans-serif;
  --font-serif: 'RIDIBatang', 'Libre Baskerville', serif;
  --font-mono: 'Courier New', monospace;
  
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}

/* Dark Mode */
[data-theme="dark"] {
  --color-primary-base: #ECF0F1;
  --color-surface-card-light: #2C3E50;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #BBBBBB;
  --color-border: #444444;
}

/* Global Styles */
* {
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: var(--font-sans);
}

/* Safe Area */
@supports (padding: max(0px)) {
  body {
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}
```

**VS Code**: 파일이 생성되고 문법 하이라이트 표시

---

### 1.7 기본 레이아웃 구성

**파일**: `src/app/layout.tsx`

```typescript
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import '../styles/globals.css'
import '../styles/tokens.css'

export const metadata: Metadata = {
  title: '예술영화관 상영 통합 조회',
  description: '서울 독립·예술영화관 상영 정보 통합 조회 서비스',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
```

**파일**: `src/app/page.tsx`

```typescript
export default function Home() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">예술영화관 상영 통합 조회</h1>
      <p className="text-gray-600">Phase 1: 초기화 중...</p>
    </main>
  )
}
```

**VS Code 확인**: 파일 생성 후 저장

---

### 1.8 개발 서버 실행 & 확인

```bash
npm run dev
```

**터미널 출력**:
```
> next dev

  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in xxx ms
```

**브라우저**:
1. `http://localhost:3000` 열기
2. "예술영화관 상영 통합 조회" 텍스트 표시 확인
3. VS Code 터미널에 접속 로그 표시 확인

---

### 1.9 Git Commit

```bash
git add .
git commit -m "feat: Phase 1 초기화 - Next.js 프로젝트 및 기본 레이아웃"
```

**VS Code**: 
- Source Control 탭에서 커밋 확인
- `git log --oneline`으로 히스토리 확인

---

### ✅ Phase 1 완료 체크리스트

```
□ npm create next-app 완료
□ 의존성 설치 완료
□ 폴더 구조 생성 완료
□ .env.local 설정 완료
□ 디자인 토큰 CSS 정의 완료
□ 기본 레이아웃 구성 완료
□ npm run dev 실행 확인
□ localhost:3000 접속 확인
□ git commit 완료
```

---

## Phase 2️⃣: 극장/지도 기능

**📅 예상 시간**: 3-4시간  
**상태**: ⏳ Phase 1 완료 후 시작

### 개요

이 단계에서:
- 위치 기반 극장 검색 (⭐ 중요)
- 지도에 극장 마커 표시
- 극장 목록/상세 페이지

---

### 2.1 Location Adapter 구현

**파일**: `src/lib/adapters/location.ts`

```typescript
export interface LocationCoords {
  lat: number
  lng: number
}

export interface ILocationAdapter {
  getCurrentPosition(): Promise<LocationCoords>
  watchPosition(callback: (coords: LocationCoords) => void): () => void
  getDefaultLocation(): LocationCoords
}

// Web 구현
export const webLocationAdapter: ILocationAdapter = {
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.warn('Location permission denied:', error)
          // 권한 거부 시 기본값 (서울 시청)
          resolve(this.getDefaultLocation())
        },
        { timeout: 10000 }
      )
    })
  },

  watchPosition(callback) {
    const watchId = navigator.geolocation.watchPosition((position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
    })
    return () => navigator.geolocation.clearWatch(watchId)
  },

  getDefaultLocation() {
    // 서울 시청 좌표
    return { lat: 37.5665, lng: 126.9780 }
  },
}

// 선택할 위치 Adapter
export const locationAdapter = webLocationAdapter
```

**VS Code**: 파일 생성 및 타입 정의 표시

---

### 2.2 useUserLocation Hook

**파일**: `src/hooks/queries/useUserLocation.ts`

```typescript
import { useEffect, useState } from 'react'
import { locationAdapter } from '@/lib/adapters/location'

interface UseUserLocationReturn {
  lat: number | null
  lng: number | null
  isLoading: boolean
  error: Error | null
}

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UseUserLocationReturn>({
    lat: null,
    lng: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    locationAdapter.getCurrentPosition()
      .then((coords) => {
        if (mounted) {
          setLocation({
            lat: coords.lat,
            lng: coords.lng,
            isLoading: false,
            error: null,
          })
        }
      })
      .catch((error) => {
        if (mounted) {
          setLocation({
            lat: locationAdapter.getDefaultLocation().lat,
            lng: locationAdapter.getDefaultLocation().lng,
            isLoading: false,
            error: error as Error,
          })
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  return location
}
```

**테스트**: 브라우저 개발자 도구 → 콘솔에서 위치 허용 확인

---

### 2.3 지도 컴포넌트

**파일**: `src/components/map/Map.tsx`

```typescript
'use client'

import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface MapProps {
  center: { lat: number; lng: number }
  zoom?: number
}

export function Map({ center, zoom = 13 }: MapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height: '500px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <Marker position={[center.lat, center.lng]}>
        <Popup>현재 위치</Popup>
      </Marker>
    </MapContainer>
  )
}
```

---

### 2.4 홈페이지 업데이트

**파일**: `src/app/page.tsx`

```typescript
'use client'

import { useUserLocation } from '@/hooks/queries/useUserLocation'
import { Map } from '@/components/map/Map'

export default function Home() {
  const { lat, lng, isLoading } = useUserLocation()

  if (isLoading) {
    return <div className="p-4">위치 정보 로딩 중...</div>
  }

  if (!lat || !lng) {
    return <div className="p-4">위치 정보를 가져올 수 없습니다</div>
  }

  return (
    <main>
      <h1 className="p-4 text-2xl font-bold">예술영화관 상영 통합 조회</h1>
      <Map center={{ lat, lng }} />
      <div className="p-4">
        <p>현재 위치: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
      </div>
    </main>
  )
}
```

---

### 2.5 브라우저 확인

```bash
# 터미널에서 이미 npm run dev 실행 중이면
# 브라우저를 새로고침 (F5)
```

**확인 사항**:
1. "위치 정보 로딩 중..." 표시 후 지도 로드
2. 지도에 현재 위치 마커 표시
3. 좌표 표시 (서울 시청 또는 사용자 위치)

**VS Code**: 파일 변경이 자동으로 반영 (Hot Reload)

---

### 2.6 Git Commit

```bash
git add .
git commit -m "feat: Phase 2 - Location Adapter와 지도 기본 구성"
```

---

### ✅ Phase 2 완료 체크리스트

```
□ Location Adapter 구현
□ useUserLocation Hook 구현
□ 지도 컴포넌트 구성
□ 홈페이지 지도 통합
□ 브라우저에서 지도 표시 확인
□ git commit 완료
```

---

## Phase 3️⃣: 영화/상영시간표 기능

**📅 예상 시간**: 4-5시간  
**의존**: Phase 2 완료 + 백엔드 API 엔드포인트

### 개요 (자세한 내용은 추후)

- 영화 검색
- 상영시간표 조회
- 홈페이지에 "가까운 극장", "지금 상영중", "곧 개봉" 섹션

---

## Phase 4️⃣: 사용자 기능

**📅 예상 시간**: 3-4시간  
**의존**: Phase 3 완료 + 백엔드 Auth & Favorites API

---

## Phase 5️⃣: 성능 최적화 & 마이그레이션 준비

**📅 예상 시간**: 2-3시간

---

## 🔧 유용한 명령어

```bash
# 개발 서버
npm run dev              # http://localhost:3000

# 타입 체크
npm run type-check      # TypeScript 문제 확인

# 빌드
npm run build            # Production 빌드
npm start               # Production 서버 실행

# 분석
npm run analyze         # 번들 크기 분석

# Git
git status              # 변경사항 확인
git diff                # 상세 변경 내용
git log --oneline       # 커밋 히스토리
```

---

## 🎯 주의사항

### VS Code에서
- 📁 좌측: 파일 구조 실시간 확인
- 💻 하단: 터미널 (npm 명령어)
- 🌐 분리 창: 브라우저 (localhost:3000)

### 개발 중
- ❌ 직접 수정하지 않고 Git으로 추적
- ✅ 단계별 Commit
- ✅ 각 Phase 완료 후 테스트

---

## 🚀 다음 단계

1. **Phase 1 완료 후** → 이 문서의 Phase 2️⃣ 섹션 진행
2. **각 Phase 완료 후** → Git commit
3. **전체 완료 후** → Production build & Capacitor 준비

---

**작성일**: 2026-05-01  
**현재 Phase**: 🟡 1 (준비 중)
