# 인프라 & 호스팅 전략

> 무료 시작 → 잘 되면 이전 가능한 구조 유지

---

## ⚠️ TBD (백엔드 팀과 협의 필수)

- [ ] **DB 선택**: Supabase vs 자체 서버?
- [ ] **백엔드 구현**: Node.js/Express vs Python/FastAPI vs Java/Spring?
- [ ] **외부 API 연동**: KMDB/TMDB 프론트에서 직접 vs 백엔드 정규화?

---

## 추천 조합 (MVP)

| 영역 | 서비스 | 무료 한도 | 이전 시 |
|------|--------|-----------|---------|
| **프론트 호스팅** | Vercel Hobby | 100GB 트래픽/월 | Vercel Pro 또는 자체 빌드 |
| **백엔드 + DB** | Supabase | 500MB DB, 50MB 파일, 월 50K MAU | Supabase Pro 또는 자체 Postgres |
| **도메인** | Namecheap / Gabia | 별도 비용 | 그대로 |

---

## Supabase 추천 이유

- PostgreSQL + Auth + Storage + Realtime 한 번에 해결 → 백엔드 개발 부담 ↓
- 클라이언트 SDK로 프론트에서 직접 호출 가능 (BFF 없이도 가능)
- Row Level Security로 권한 관리 용이
- Postgres 표준 → 자체 호스팅 이전 시 마이그레이션 쉬움

---

## 대안

| 서비스 | 용도 |
|--------|------|
| **Cloudflare Pages** | Vercel 대안. 트래픽 무제한, cold start 없음 |
| **Neon** | Serverless Postgres. 무료 0.5GB. Supabase의 DB만 필요할 때 |
| **Railway** | 월 $5 크레딧. 풀스택 자체 서버 띄울 때 |

---

## 외부 데이터 소스

- 영화 포스터, 메타 정보는 **외부 API 직접 참조** (자체 호스팅 X)
- 영화 DB 후보:
  - **KMDB** — 한국영화데이터베이스, 한국 독립/예술영화 정보 풍부
  - **TMDB** — 글로벌 영화 DB, 포스터 이미지 품질 우수
- API 키는 환경 변수, 절대 클라이언트 코드에 노출 금지

---

## 환경 변수

```bash
# .env.local (gitignore — 로컬 전용)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3001

KMDB_API_KEY=        # 서버 사이드 전용 (NEXT_PUBLIC_ 없음)
TMDB_API_KEY=        # 서버 사이드 전용
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

```bash
# .env.example (커밋 가능 — 키 없는 템플릿)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=

KMDB_API_KEY=
TMDB_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

**규칙**: `NEXT_PUBLIC_` 접두사 없는 변수는 절대 클라이언트 코드에서 참조 금지

---

## 배포 흐름

```
로컬 개발
   ↓ feature 브랜치 push
Vercel Preview Deploy 자동 생성 (PR 미리보기)
   ↓ PR 리뷰 후 develop 머지
Vercel Preview (develop 환경)
   ↓ QA 통과 후 main 머지
Vercel Production Deploy
   ↓
Supabase는 별도 마이그레이션 (백엔드 담당)
```
