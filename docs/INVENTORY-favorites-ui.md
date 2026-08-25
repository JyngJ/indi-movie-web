# 관심(하트) UI 인벤토리 — 2026-08-24, feature/notifications(4b84879) 기준

하트 노출·등록 진입점이 화면마다 달라 전수 조사했다. 규칙을 정하기 전의 실태 기록이다.

## 1. 포스터 렌더 지점 × 하트 노출

하트가 있는 곳은 **상세 3곳 + 관심 목록**뿐. 포스터 위 오버레이 하트는 앱 전체에서
관심 목록 영화 그리드 한 곳(해제용)만 존재한다.

| # | 화면/섹션 | 위치 | 하트 | 형태 |
|---|---|---|---|---|
| 1 | 상영작 · 큐레이션 캐러셀 카드(공용 MovieCard) | `CurationSectionRow.tsx:310` | 없음 | 좌상=주년칩 · 우상=D-N칩 · 좌하=순위 |
| 2 | 상영작 · 큐레이션 2편 스택 변형 | `CurationSectionRow.tsx:432` | 없음 | |
| 3 | 상영작 · **내 관심 영화 지금 상영 중** | `favorites/FavoriteMoviesSection.tsx:36` | 없음 | 관심 전용 섹션인데도 없음 |
| 4 | 상영작 · 이런 작품은 어때요(개인화) | `PersonalizedSection.tsx:89` | 없음 | |
| 5 | 상영작 · 감독 특별전 | `DirectorSpecialSection.tsx:94` | 없음 | |
| 6 | 상영작 · 랭킹 섹션 | `FilmRankingSection.tsx:184` | 없음 | |
| 7 | 상영작 · 개봉 N주년 | `AnniversarySection.tsx:138` | 없음 | |
| 8–9 | 상영작 · 인스타 추천(단일/스트립) | `InstagramRecsSection.tsx:187,214` | 없음 | |
| 10 | 상영작 · 전체 영화 그리드 | `AllMoviesGrid.tsx:130` | 없음 | 자체 GridPoster |
| 11 | 상영작 · 감독 스포트라이트(원형 사진) | `DirectorSpotlightSection.tsx:94` | 없음 | 감독 하트도 없음 |
| 12–13 | 지도 · 핀 포스터(그리드/단일 스케줄) | `map/PosterGrid.tsx:263,222` | 표시 전용 | 빨간 inset 링 — 토글 불가 |
| 14 | 지도 · 핀 카드 하트 캡슐+개수 | `MapView.tsx:161` | 표시 전용 | |
| 15 | 지도 · 극장 핀 하트(dot/뱃지) | `MapPin.tsx:87,112` | 표시 전용 | 비로그인 시 숨김 |
| 16 | 지도 · 검색 패널 영화 결과 행 | `MapView.tsx:2865` | 없음 | |
| 17 | 지도 · 큐레이션 시트 카드(관심 섹션 포함) | `CurationSheet.tsx:263` | 없음 | 우상단은 거리 뱃지 |
| 18–21 | 극장 시트 · 포스터 스트립/상세 카드 | `TheaterSheet.tsx:1259,1602,1706,1764` | 없음 | 극장 하트는 헤더 액션 pill만 |
| 22–23 | GV 카드 / GV 상세 히어로 | `GvEventSection.tsx:167` 등 | 없음 | |
| 24 | 영화 상세(/movie/[id]) | `MovieDetailClient.tsx:710` | **있음** | 액션 행 [♡ 관심 영화 등록][공유] |
| 25 | 상영작 영화 상세(/films/movie/[id]) | `FilmsMovieDetailClient.tsx:288` | **있음** | 액션 행 |
| 26 | 데스크톱 영화 패널 | `desktopDetailPanel/MoviePanel.tsx:120` | **있음** | 액션 행 |
| 27–30 | 감독 상세 필모 행(4변형) | `DirectorDetailClient.tsx:166` 등 | 행 단위 없음 | 감독 하트는 액션 행만 |
| 31 | 극장 상세 상영작 카드 | `FilmsTheaterDetailClient.tsx:177` | 없음 | |
| 32–33 | 영화제 라인업(캐러셀/그리드) | `FestivalDetailClient.tsx:255,277` | 없음 | |
| 34 | 소식 피드 카드 썸네일 | `favorites/FeedList.tsx:73` | 없음 | 관심 기반 피드인데 해제 불가 |
| 35 | **관심 목록 · 영화 그리드** | `favorites/FavoritesContent.tsx:87` | **있음** | 포스터 우상단 오버레이 하트 32 — 유일 |
| 36–37 | 관심 목록 · 극장/감독 행 | `FavoritesContent.tsx:114,133` | 있음 | 행 우측 ghost 하트 |
| 38 | 지역 랜딩 배경 포스터(장식) | `films/area/[region]/page.tsx:115` | 없음 | aria-hidden |

검색 결과(SearchPanel/FilmsSearchBar)는 포스터 미렌더. `PosterThumb`에는 하트 슬롯 자체가 없음(selected 체크만).

## 2. 관심 등록(토글) 진입점 — 13곳

코어: `useFavorites.toggle` → 비로그인 시 `useRequireAuth` → `uiStore.openLoginSheet` → `LoginSheet`(providers.tsx 마운트). 컨트롤 3종: `FavoriteActionRow`/`FavoriteActionButton` · `TheaterFavoriteAction` · `FavoriteToggle`(하트 프리미티브).

| # | 화면 | 대상 | 형태 | 위치 | 비로그인 |
|---|---|---|---|---|---|
| 1 | 영화 상세(/movie/[id]) | 영화 | 액션 행 | `MovieDetailClient.tsx:710` | 로그인 시트 |
| 2 | 상영작 영화 상세 | 영화 | 액션 행 | `FilmsMovieDetailClient.tsx:288` | 로그인 시트 |
| 3 | 데스크톱 영화 패널 | 영화 | 액션 행 | `MoviePanel.tsx:120` | 로그인 시트 |
| 4 | 감독 상세(/director) | 감독 | 액션 행 | `DirectorDetailClient.tsx:259` | 로그인 시트 |
| 5 | 상영작 감독 상세 | 감독 | CTA 행 단독 버튼 | `FilmsDirectorDetailClient.tsx:145` | 로그인 시트 |
| 6 | 데스크톱 감독 패널 | 감독 | 액션 행 | `DirectorPanel.tsx:66` | 로그인 시트 |
| 7–9 | 극장 시트(모바일 헤더/데스크톱 독/expanded) | 극장 | 액션 pill [♡ 관심] | `TheaterSheet.tsx:984,1090,1380` | 로그인 시트 |
| 10 | 극장 상세(/films/theater) | 극장 | CTA 행 단독 버튼 | `FilmsTheaterDetailClient.tsx:473` | 로그인 시트 |
| 11 | 관심 목록 · 영화 | 영화 | 포스터 오버레이 하트 | `FavoritesContent.tsx:94` | /my 리다이렉트 |
| 12–13 | 관심 목록 · 극장/감독 | 극장·감독 | 행 우측 하트 | `FavoritesContent.tsx:114,133` | /my 리다이렉트 |

## 3. 불일치 요약 (정리할 것)

1. **목록에서 등록 불가** — 포스터 카드 30여 곳 전부 하트 없음. 등록은 상세 진입 필수. 특히 관심 전용 섹션(#3 내 관심 영화, #17 관심 작품 상영 중, #34 소식 피드)조차 해제 수단이 없다.
2. **하트 기호 의미 혼용** — 상세=텍스트 라벨 버튼(등록), 관심 목록=오버레이 아이콘(해제), 지도=토글 불가 표식(등록됨). 같은 ♥가 버튼과 상태 표식 둘로 쓰인다.
3. **감독 상세 컨트롤 형태 라우트별 상이** — 모바일/데스크톱은 FavoriteActionRow, /films/director는 CTA 행에 낀 단독 버튼.
4. **로그인 유도 문구 3중 중복** — LOGIN_COPY가 `FavoriteToggle.tsx:7` · `FavoriteActionRow.tsx:8`에 중복 정의, `TheaterFavoriteAction.tsx:19`는 인라인 문자열.
5. **죽은 슬롯** — `MovieDetailClient.tsx:69` 상단바 trailing(하트) 슬롯은 정의만 있고 사용처 없음.
6. **비로그인 처리 갈림** — 토글 13곳은 로그인 시트로 일관되나, 관심 목록 화면만 /my 리다이렉트, 지도 표식은 조용히 숨김.

## 4. 피그마 "계정 P1·P2 — 코드 동기" 섹션 차이 (2026-08-24 대조)

코드(feature/notifications)가 8/17 동기 이후 앞서간 부분. 반영 스크립트:
`~/.claude/skills/figma-scripter-sync/account-sync-20260824.js` (Scripter loader NAME 바꿔 Run).

| 프레임 | 피그마(낡음) | 코드(현행) |
|---|---|---|
| K·dE MY 로그인 | [프로필 수정] 버튼 | 제거(8/20) — 프로필·계정 관리 행과 중복 입구 |
| K·dE | 보관함 4타일(관람기록/리뷰/통계 dim) | 제거(8/20) — "내 관심 목록" 메뉴 행으로 |
| K·dE | 알림 설정 dim + "카톡 알림 · … 다이제스트 (준비 중)" | 활성 행 + "새 상영 · 막바지 · 방해 금지 시간" |
| (없음) | 알림 설정 화면 프레임 부재 | NotificationSettingsContent 존재 → O 프레임 신규 |
| L MY 비로그인 | "…극장·감독을 저장하고, 새 상영 소식을 카톡으로…" | "…극장을 저장하고, 새로 상영 소식이 생기면 알려드려요." |
| B 소식 피드 | 시각 "2시간 전" | FeedList는 오늘/어제/N일 전 — "오늘" |
| E/F 관심 목록 | 감독 빈 상태 문구 없음 | "감독 페이지에서 하트를 눌러 모아보세요…" (수동 보완 권장) |
| dC 관심 목록 PC 별도 페이지 | — | 코드는 MY 팝오버 내부 전환(8/22) — 프레임 주석 보완 권장 |

스크립트 실행 후: Scripter에서 dump-state → `npm run ds:build`.
