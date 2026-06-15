# 영화 탭 — 큐레이션 리스트 섹션 구현 계획

> 근거: PRD(영화 탭 — 큐레이션 리스트 섹션, 초안) + 와이어프레임 `영화 탭 시안 A.html`
> 관련 문서: [DESIGN.md](./DESIGN.md), [DB.md](./DB.md)

## 0. 현재 상태

- `src/components/navigation/GlobalNav.tsx`: 모바일 탭바 `MOBILE_TABS`에 영화 탭이
  `// { key: 'films', href: '/films', label: '영화', Icon: IconFilm },  // 미개발` 로 주석 처리되어 있음.
  데스크톱 레일도 `MOBILE_TABS` 기반이라 자동으로 같이 빠져 있음.
- `src/app/(tabs)/films/page.tsx`: "영화 탭 — 준비 중" 빈 셸만 존재. 주석에 "P3(feat/films-wireframe)에서 채울 예정"이라 적혀 있음.

## 1. 화면 구성

와이어프레임의 기획전 히어로 / 독립영화 주간 랭킹 / 곧 내려가는 영화 / 감독 스포트라이트
섹션은 이번 스코프에서 전부 제외. 영화 탭은 **TopBar + 큐레이션 리스트 섹션들**로만 구성:

```
[TopBar: 영화 / 지금 만날 수 있는 영화 N편 / 검색 / 장르·국가·정렬]
─────────────────────────────────
[섹션 1: 여름엔 역시 공포]  → 가로 스크롤 포스터 1줄
[섹션 2: 90년대 영화]      → 가로 스크롤 포스터 1줄
[섹션 3: ...]
...
(스크롤 더 내리면 다음 섹션 추가 로드, 끝까지 보여줬으면 종료)
```

- 각 섹션 = PRD §2 카탈로그의 `curation_list` 한 항목, §3 노출 조건(교집합 ≥ N) 만족 시에만 렌더
- 정렬: tier 3 → 2 → 1, 동률은 교집합 편수 desc (PRD §6-5, 잠정)
- 초기 N개 섹션만 렌더 → 무한 스크롤로 다음 섹션들 점진 로드 → 더 보여줄 섹션 없으면 종료(빈 섹션/로딩 인디케이터 없음)

## 2. 영화 탭 진입 활성화

- `GlobalNav.tsx`의 `MOBILE_TABS`에서 films 항목 주석 해제 (데스크톱 레일도 같은 배열 사용하므로 자동 반영)
- `films/page.tsx` 빈 셸 → TopBar + 큐레이션 리스트 섹션 리스트로 교체

## 3. TopBar

- 좌측: "영화" 타이틀 + "지금 만날 수 있는 영화 N편" (PRD §4 헤더 카운트)
  - N = 현재 지역(R) 라이브 상영작 수. 기존 지도/시트의 region 필터·live query 재사용
- 중앙: 검색 (영화/감독/배우) — 기존 검색 오버레이 연동 검토
- 우측 칩: 장르 · 국가 · 정렬 (메타데이터 기반, `genre[]`, `nation`, 정렬 기준은 일단 `release_date desc` 등)

## 4. 큐레이션 리스트 섹션 — 데이터 모델

```sql
create table curation_list (
  id            uuid primary key default gen_random_uuid(),
  list_id       text unique not null,        -- 'summer_horror', 'christmas' 등
  name_ko       text not null,
  type          text not null check (type in ('dynamic','static')),
  query         jsonb,                        -- type=dynamic: { genre, release_year_range, ... }
  member_ids    jsonb,                        -- type=static: tmdb_id/kmdb_id 배열
  priority_tier smallint not null check (priority_tier in (1,2,3)),
  season_trigger jsonb,                       -- { start: '07-01', end: '08-31' } (optional)
  min_n         smallint,                     -- 리스트별 임계값 override (optional)
  created_at    timestamptz not null default now()
);
```

- PRD §1 그대로. `member_ids`는 `tmdb_id` 기준 매칭(기존 `movies.tmdb_id UNIQUE` 인덱스 활용).

## 5. Phase 0 — 현황 측정 (선행 작업, 코드 없음)

각 카탈로그 후보 리스트 × 지역(서울 전체/구 단위)에서 실제 교집합 편수를 측정하는
1회성 쿼리 스크립트 작성. 산출물: 리스트 × 지역 교집합 표 (PRD §5 Phase 0).

- 측정 대상: §6 카탈로그 중 dynamic 가능한 것부터 (연대별, 여름=공포, 발렌타인=멜로)
- 목적: 전역 N=5 적합 여부, 리스트별 차등 N 필요 여부 판단 (PRD §6-4)

## 6. Phase 1 — Dynamic 리스트 (노동 0)

`movies.release_year`(존재 확인됨, `docs/DB.md`)·`movies.genre[]` 기반으로 즉시 가능:

| list_id | name_ko | query | season_trigger | tier |
|---|---|---|---|---|
| `summer_horror` | 여름엔 역시 공포 | `genre @> '{호러}'` | 07-01~08-31 | 3 |
| `valentine_romance` | 발렌타인 = 멜로 | `genre @> '{멜로}'` (또는 `{로맨스}`) | 02-01~02-28 | 3 |
| `decade_90s` 등 | 90년대 영화 | `release_year between 1990 and 1999` | 없음 | 1 |
| `decade_00s` 등 | 2000년대 영화 | `release_year between 2000 and 2009` | 없음 | 1 |

- "외부 고평점"(`vote_count` 임계 컷)은 `movies.rating`/`vote_count`가 KMDB import 경로에서
  채워지지 않음(DB.md 명시) → **Phase 1에서 제외**, TMDB 데이터 백필 작업이 선행되어야 함 (PRD §6-2)

## 7. 노출 로직 (PRD §3 그대로 적용)

- `(리스트 멤버 ∩ 지역 R 라이브 상영작) ≥ N` 인 리스트만 렌더링. N 기본 5 (Phase 0 측정 후 보정)
- 빈 섹션 미렌더

## 8. UI 컴포넌트 — 기존 DESIGN.md 토큰 그대로 사용

신규 토큰 추가 없이 기존 `PosterThumb`(md: 96×144) · `FilterChip`(32px) ·
`SectionDivider`류 헤더 패턴으로 1차 구현. 와이어프레임의 `SectionHead` + `Carousel` +
`PosterCard` 형태(가로 스크롤 1줄)는 참고만 하고, 실제 크기/타이포는 DESIGN.md 기존 값을 사용.

```jsx
<SectionHeader title={list.name_ko} />
<HorizontalScroll>
  {members.map(f => <PosterThumb size="md" movie={f} />)}
</HorizontalScroll>
```

- 클릭 시 기존 지도 영화 상세 패널 재사용 (PRD §3.3, 신규 페이지 없음)
- "더보기"/전체 목록 UI는 이번 스코프 보류 — 무한 스크롤로 섹션 단위 더 보여주는 것까지만
- 구현 후 실제 화면 보고 크기/간격/토큰 조정 요청 예정 (이번엔 기존 토큰 기준으로 우선 진행)

## 9. 이번 스코프 제외 (별도 트랙)

- 기획전 히어로, 독립영화 주간 랭킹, 곧 내려가는 영화, 감독 스포트라이트 — 와이어프레임에는
  있으나 PRD Out-of-scope 또는 데이터 미비로 이번엔 다루지 않음
- 영화제 수상작/평론가 추천/소설원작/실화기반/크리스마스 (static, ID 적재 노동 필요 → Phase 2)
- 영화제 개최 주간 (Phase 3, 연 N회 갱신)

## 10. 구현 단계 (단계별로 확인하며 진행)

각 단계 끝날 때마다 화면 확인 후 다음 단계로. §5~7의 "Phase 0/1"은 데이터 측정/카탈로그
단계이고, 아래는 그걸 코드로 점진 적용하는 구현 단계.

### 구현 1 — 골격만 (목 데이터, 임계값 없음)
- GlobalNav films 탭 주석 해제
- `films/page.tsx`: TopBar(타이틀만, 카운트는 placeholder) + 큐레이션 섹션 N개 가로 스크롤
- 데이터: `curation_list` 테이블 없이 코드 하드코딩(여름=공포, 90년대 등) + `genre`/`release_year`로 멤버만 조회
- **교집합 N 임계값 없음** — 멤버 있으면 무조건 렌더
- 목적: 라우팅/레이아웃/포스터 카드 렌더 확인

### 구현 2 — DB 테이블 + 실 지역 교집합
- `curation_list` 마이그레이션 적용, Phase1 dynamic 리스트(summer_horror, valentine_romance, decade_90s, decade_00s) seed
- 멤버 ∩ 현재 지역(R) 라이브 상영작 쿼리로 교체. **여전히 N 임계값 없음**(교집합 0이어도 그대로 표시) — 쿼리 정확성 확인용
- §5 Phase 0 측정 스크립트도 이 시점에 같이 돌려서 리스트×지역 교집합 편수 표 확보

### 구현 3 — 노출 조건 + tier 정렬
- 구현 2 측정 결과로 N 확정(전역 또는 리스트별)
- `교집합 ≥ N` 필터 적용, 빈 섹션 숨김
- tier 3→2→1 정렬

### 구현 4 — 무한 스크롤
- 초기 K개 섹션만 렌더, 스크롤 시 다음 섹션 점진 로드, 더 없으면 종료

### 구현 5 — TopBar 완성
- "지금 만날 수 있는 영화 N편" 실 카운트, 검색 연동, 장르/국가/정렬 칩 동작
