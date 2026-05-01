# 예술영화관 상영 통합 조회 웹서비스

> 서울 독립·예술영화관 상영 정보 통합 조회 모바일 웹 서비스 (MVP)

## 프로젝트 개요

### 핵심 기능
- 🗺️ **지도 기반 극장 탐색** - 사용자 위치 기반 가까운 극장 검색
- 🎬 **영화 검색** - KMDB/TMDB 통합 영화 정보 조회
- ⏰ **상영시간표** - 극장별/영화별 상영 시간표 조회
- ⭐ **즐겨찾기** - 극장/영화 즐겨찾기 및 알림 설정

### 플랫폼
- **MVP**: 모바일 웹 (375px 기준)
- **향후**: React Native/Capacitor로 앱 확장 가능한 구조

## 빠른 시작

```bash
npm install
npm run dev
# http://localhost:3000
```

## 기술 스택

| 영역 | 도구 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 상태관리 | React Query (서버), Zustand (UI) |
| 스타일링 | Tailwind CSS |
| 지도 | Leaflet |
| 데이터베이스 | Supabase 또는 자체 서버 (TBD) |

## 문서

- 📋 **[CLAUDE.md](./CLAUDE.md)** - Claude 작업 컨텍스트 & 지시사항
- 📖 **[DEVELOPMENT.md](./DEVELOPMENT.md)** - API 스펙, DB 스키마, 개발 계획
- 🔄 **[WORKFLOW.md](./WORKFLOW.md)** - Phase별 작업 흐름

## 프로젝트 구조

```
src/
├── app/                  # 페이지 (Next.js App Router)
├── components/           # React 컴포넌트
│   ├── primitives/       # Button, Input, Card 등
│   └── domain/           # MovieCard, TheaterPin 등
├── hooks/                # Custom Hooks (API, UI)
├── lib/                  # 유틸리티, API 클라이언트
├── store/                # Zustand 상태관리
├── styles/               # CSS, 디자인 토큰
└── types/                # TypeScript 타입 정의
```

## ⚠️ TBD (백엔드 팀과 협의 필수)

- DB 선택: Supabase vs 자체 서버
- 백엔드 구현 방식
- 외부 API 연동 방식 (KMDB/TMDB)
