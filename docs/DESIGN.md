# 디자인 시스템

> 예술영화관 상영 통합 조회 서비스 — 디자인 토큰 & 컴포넌트 가이드

**토큰 참조 파일**: `src/styles/tokens.css` (CSS 변수)  
**JS 토큰 스펙**: 아래 `tokens.js` 주석 참고

---

## 원칙

- 컴포넌트에서 hex 하드코딩 절대 금지
- 모든 색상·간격·타이포그래피는 CSS 변수(`var(--...)`) 참조
- Figma 변수 네이밍과 코드 네이밍 일치
- **새 코드는 px 리터럴 대신 토큰을 쓴다.** 토큰에 없는 값이 필요하면 스케일에 토큰을 추가하고
  이 문서에 기록한다 — 새 이름을 즉흥적으로 만들지 말 것(예: `--font-size-*`, `--space-*` 같은
  병렬 네이밍 금지, 기존 `--text-*`/`--spacing-*`/`--radius-*` 체계를 확장한다).

---

## 색상 토큰

### Primary

| JS 키 | CSS 변수 | 값 | 용도 |
|-------|----------|----|------|
| `color.primary.base` | `--color-primary-base` | `#4A6380` | 독립영화관 핀, 활성 칩, CTA, 오늘 날짜 |
| `color.primary.hoverLight` | `--color-primary-hover-l` | `#5C7896` | 라이트 모드 hover/press |
| `color.primary.hoverDark` | `--color-primary-hover-d` | `#3A5068` | 다크 모드 hover/press |
| `color.primary.subtleLight` | `--color-primary-subtle-l` | `#E8EEF4` | 활성 칩 배경 (라이트) |
| `color.primary.subtleDark` | `--color-primary-subtle-d` | `#1A2530` | 활성 칩 배경 (다크) |
| `color.primary.text` | `--color-primary-text` | `#2B3D50` | primary 위 텍스트 |

### Multiplex (지도 핀 전용, 본문 사용 금지)

| JS 키 | 값 |
|-------|-----|
| `color.multiplex.cgv` | `#E30613` |
| `color.multiplex.mega` | `#6C1E9F` |
| `color.multiplex.lotte` | `#ED1C24` |

### Semantic

| JS 키 | CSS 변수 | 값 | 용도 |
|-------|----------|----|------|
| `color.semantic.warning` | `--color-warning` | `#D97706` | 잔여석 적음·종료임박 |
| `color.semantic.success` | `--color-success` | `#4A7C59` | 예매완료·저장 확인 |
| `color.semantic.error` | `--color-error` | `#B94A48` | 매진 강조·에러·일/공휴일 dow |

### Neutral

| JS 키 | 값 |
|-------|-----|
| `color.neutral[50]` | `#F8F6F2` |
| `color.neutral[100]` | `#F0EDE6` |
| `color.neutral[200]` | `#DDD9CF` |
| `color.neutral[400]` | `#A9A39A` |
| `color.neutral[500]` | `#857F76` |
| `color.neutral[600]` | `#635D55` |
| `color.neutral[700]` | `#4A4540` |
| `color.neutral[800]` | `#2E2A25` |
| `color.neutral[900]` | `#1A1714` |

> ⚠️ `neutral[300]` 미정의 — 필요 시 `#C4BFB6` 추가 고려

### Surface

| JS 키 | CSS 변수 | 라이트 | 다크 |
|-------|----------|--------|------|
| `surface.page` | `--color-surface-bg` | `#F8F6F2` | `#0E0D0B` |
| `surface.card` | `--color-surface-card` | `#FFFFFF` | `#1A1814` |
| `surface.raised` | `--color-surface-raised` | `#F0EDE6` | `#242019` |
| `surface.border` | `--color-border` | `#DDD9CF` | `#2C2820` |

### Text

| JS 키 | CSS 변수 | 라이트 | 다크 |
|-------|----------|--------|------|
| `text.primary` | `--color-text-primary` | `#1A1714` | `#F8F6F2` |
| `text.body` | `--color-text-body` | `#4A4540` | `#DDD9CF` |
| `text.sub` | `--color-text-sub` | `#635D55` | `#A9A39A` |
| `text.caption` | `--color-text-caption` | `#857F76` | `#857F76` |
| `text.placeholder` | `--color-text-placeholder` | `#A9A39A` | `#635D55` |

---

## 타이포그래피

### 폰트 패밀리

```
display(KIMM)  제목·간판 전용. 한국기계연구원 서체(로고타입 기반의 기하학적 디스플레이체).
               굵기가 Light(300)/Bold(700) 2종뿐이라 본문에는 쓰지 않고,
               큰 제목·극장명·영화명·지도 라벨 등 "간판처럼 보여야 하는" 곳에만 Bold로 사용.
               한글 + 라틴(영문 대소문자) + 숫자 + 기호 모두 지원 →
               한·영 혼용 제목도 KIMM 한 벌로 처리 가능.
               (뒤의 Pretendard는 폰트 로드 실패 시 폴백용)
               ※ 출처 표시 필수: "출처 – 한국기계연구원, kimm.re.kr"

latin          영문 원제·감독명을 세리프 이탤릭으로 멋부릴 때 쓰는 선택적 악센트
               (예: dir. Bong Joon-ho). 굳이 안 써도 되고,
               영문 제목도 KIMM(display)으로 통일 가능.

ui             UI 전반·본문·12px 이하 작은 텍스트. 한글/영문/숫자 모두.

mono           HEX, 상영 시간, 좌석수 등 정렬이 필요한 수치(tnum).
```

| JS 키 | CSS 변수 | 폰트 | 용도 |
|-------|----------|------|------|
| `type.family.display` | `--font-display` | `'KIMM', 'Pretendard', sans-serif` | 제목·간판·지도 라벨 (KIMM Bold) |
| `type.family.korean` | `--font-serif` | `'KIMM', 'Pretendard', sans-serif` | = display, 기존 코드 호환 alias |
| `type.family.ui` | `--font-sans` | `'Pretendard', -apple-system, sans-serif` | UI 전반·본문 |
| `type.family.latin` | `--font-serif-en` | `'Libre Baskerville', serif` | 영문 원제·감독명 이탤릭 (선택적) |
| `type.family.mono` | `--font-mono` | `'SF Mono', 'ui-monospace', monospace` | HEX, 상영 시간, 좌석수 |

**KIMM체 출처 표기 필수**: `출처 – 한국기계연구원, kimm.re.kr`

**KIMM @font-face 로드**:
```css
@font-face { font-family:'KIMM'; font-weight:300; src:url('/fonts/KIMM_Light.ttf') format('truetype'); }
@font-face { font-family:'KIMM'; font-weight:700; src:url('/fonts/KIMM_bold.ttf')  format('truetype'); }
```

### 타입 스케일

| JS 키 | size | weight | lineHeight | 폰트 | 용도 |
|-------|------|--------|------------|------|------|
| `h1` | 24px | 700 | 1.25 | KIMM Bold | 영화 대제목 |
| `h2` | 22px | 700 | 1.3 | KIMM Bold | 극장명 헤더 |
| `h3` | 20px | 700 | 1.3 | KIMM Bold | 바텀시트 극장명 |
| `mapLabel` | 11px | 700 | 1 | KIMM Bold | 지도 핀 라벨 |
| `title` | 17px | 700 | 1.4 | Pretendard | 카드 제목 |
| `subtitle` | 15px | 600~700 | 1.4 | Pretendard | 소제목·카드 헤더 (TASK-10 감사에서 추가 — 실사용 33곳) |
| `body` | 14px | 500 | 1.5 | Pretendard | 본문 |
| `meta` | 13px | 400 | 1.5 | Pretendard | 메타·주소 |
| `caption` | 11px | 500 | 1.4 | Pretendard | 라벨 caps (letter-spacing 0.4px, uppercase) |
| `badge` | 9px | 700 | 1 | Pretendard | D-1 배지 (letter-spacing 0.4px, uppercase) |
| `time` | 17px | 700 | 1 | Pretendard | 상영 시작 시간 (tnum) |
| `seat` | 12px | 600 | 1 | Pretendard | 좌석수 (tnum) |
| `dow` | 10px | 500 | 1 | Pretendard | 날짜 바 요일 |
| `date` | 16px | 700 | 1 | Pretendard | 날짜 바 일자 (tnum) |

> ⚠️ `h1~h3`, `mapLabel`은 KIMM Bold 사용. `title` 이하는 Pretendard.

---

## 간격 (spacing)

| CSS 변수 | 값 | 비고 |
|----------|----|----|
| `--spacing-1` | 4px | |
| `--spacing-1-5` | 6px | TASK-10 감사 — 실사용 41곳(`--spacing-2`보다 많음), 4px 배수는 아니지만 정식 토큰화 |
| `--spacing-2` | 8px | |
| `--spacing-2-5` | 10px | TASK-10 감사 — 실사용 31곳 |
| `--spacing-3` | 12px | |
| `--spacing-4` | 16px | |
| `--spacing-5` | 20px | |
| `--spacing-6` | 24px | |
| `--spacing-8` | 32px | `--spacing-7`(28px)는 실사용 0건 확인돼 미정의 유지 |

2px·14px·18px 등은 실사용이 적어(10건 미만) 별도 토큰화하지 않음 — stage 2에서 인접 토큰으로 수렴 대상.

---

## 반경 (radius)

| JS 키 | CSS 변수 | 값 | 용도 |
|-------|----------|----|------|
| `sm` | `--radius-sm` | 4px | 배지·캡션 라벨 |
| `md` | `--radius-md` | 6px | 포스터 썸네일 소 |
| `lg` | `--radius-lg` | 8px | 포스터 중·날짜 셀·지도 팝업 |
| `xl` | `--radius-xl` | 12px | 상영시간표 셀 |
| `2xl` | — | 20px | 바텀시트 상단 모서리 |
| `full` | — | 999px | pill — 검색창·칩·FAB |
| `circle` | — | 50% | 핀·FAB round·체크 배지 |

> TASK-10 감사에서 드리프트 확인 — 신규 토큰 추가 대신 stage 2에서 기존 값으로 수렴 예정:
> `borderRadius: 10`(34곳)이 `lg`(8)/`xl`(12) 사이에서 카드류에 혼용, `99`(19곳)는 `full`(999)의
> 이형(異形). 상세는 "알려진 불일치" 섹션 참고.

---

## 그림자 (shadow)

| JS 키 | CSS 변수 | 라이트 | 다크 |
|-------|----------|--------|------|
| `sm` | `--shadow-sm` | `0 2px 6px rgba(20,15,10,0.06)` | `0 2px 6px rgba(0,0,0,0.30)` |
| `md` | `--shadow-md` | `0 4px 12px rgba(20,15,10,0.08)` | `0 4px 12px rgba(0,0,0,0.45)` |
| `sheet` | `--shadow-sheet` | `0 -8px 24px rgba(20,15,10,0.06)` | `0 -8px 24px rgba(0,0,0,0.40)` |
| `popup` | — | `0 8px 24px rgba(20,15,10,0.18)` | `0 8px 24px rgba(0,0,0,0.55)` |
| `pin` | — | `0 2px 6px rgba(0,0,0,0.18)` | — |

---

## 컴포넌트 스펙

### FilterChip

- height: 32px, paddingH: 14px, radius: full, font: 13px/500
- default: `surface.raised` bg, `surface.border` border
- active: `primary.subtleLight` bg, `primary.base` border

> ⚠️ active text 다크 모드: `#B8C7D8` (하드코딩 — 토큰화 예정)

### MapPin

- dotSize: 22px, border: `2px solid #FFFFFF`, shadow: `0 2px 6px rgba(0,0,0,0.18)`
- label: font 11px/600, bg `rgba(255,255,255,0.85)`, radius `sm`, padding `2px 6px`

> ⚠️ `mapPin.label.font` weight 600 vs `type.scale.mapLabel` weight 700 — 불일치. mapLabel 700로 통일 권장.

### PosterThumb

| 크기 | width | height | radius |
|------|-------|--------|--------|
| `sm` | 68px | 102px | `md` (6px) |
| `md` | 96px | 144px | `lg` (8px) |
| `lg` | 별도 지정 | — | `lg` (8px) |

> ⚠️ tokens.js에 `lg` 크기 미정의 — MapView에서 zoom에 따라 동적 계산. 88×132 (zoom 14+) 기준.

- selected ring: `primary.base` 2px, badgeSize 20px, badgeBorder `2px solid #FFFFFF`
- overflow overlay: `rgba(15,12,9,0.62)`, font 18px/600, color `#FFFFFF`

### BottomSheet

- borderRadius: `20px 20px 0 0`
- handle: 36×4px, radius 2px
- posterScrollBg: `#EAE6DC` (라이트) / `#1B1813` (다크)

### DateBar

- dayCell: radius `lg`, activeColor `primary.base`
- holiday(일/공휴일): `semantic.error`
- saturday: `primary.base` (라이트) / `primary.hoverLight` (다크)
- timeChip: height 30px, paddingH 12px, radius `full`, font 12px/500

### ShowtimeCell

- padding: 12px, radius: `xl`, width: 100px
- time: 17px/700 (tnum), endTime: 11px, seat: 12px/600, hall: 11px
- soldout: opacity 0.45, line-through
- low(잔여석 적음): `semantic.warning`, D-1 badge
- late(심야): `#1A2530` bg + Moon 아이콘 (`primary.subtleLight`)

### FAB

**Round**: 44×44px, radius circle  
**Pill**: height 44px, paddingL 14px, paddingR 16px, gap 8px, font 13px/600  
innerIcon: 22×22px circle, `primary.subtleLight` bg, `primary.base` icon

### 아이콘

| 이름 | 기본 크기 | stroke | 용도 |
|------|----------|--------|------|
| Search | 16px | 1.8 | 검색창 좌측 |
| Star | 16px | 1.6 | 즐겨찾기 |
| Close | 16px | 1.8 | 바텀시트 닫기·칩 해제 |
| Plus/Minus | 18px | 1.8 | 줌인/아웃 FAB |
| Expand | 16px | 1.8 | 전체화면 FAB |
| Back | 16px | 1.8 | 뒤로가기 |
| Moon | 9px | filled | 심야 배지 내부 |
| Swap | 12px | 1.8 | 극장↔영화 FAB |

---

## 다크/라이트 모드

```
시스템 설정(prefers-color-scheme)
  ↓ 첫 진입
storageAdapter.getItem('movie-app-theme')
  ↓ 없으면 시스템 설정 적용
document.documentElement.setAttribute('data-theme', 'dark' | 'light')
```

FOUC 방지: `src/app/layout.tsx` `<head>` 인라인 스크립트 → `src/store/themeStore.ts`의 `initTheme()`.

```ts
const { setTheme } = useThemeStore()
setTheme('dark' | 'light' | 'system')
```

---

## 레이아웃 유틸

```css
/* iOS Safe Area */
padding-bottom: env(safe-area-inset-bottom);

/* ✅ 100dvh 사용 (100vh 금지) */
height: 100dvh;
```

---

## 알려진 불일치 (TODO)

| 위치 | 불일치 내용 |
|------|------------|
| `component.filterChip.active.text.dark` | `#B8C7D8` 하드코딩 — 토큰화 필요 |
| `component.mapPin.label.font.weight` | 600 vs `type.scale.mapLabel` 700 — 통일 필요 |
| `component.posterThumb` | `lg` 크기 미정의 (실제 88×132 사용) |
| `color.neutral` | `[300]` 없음 (50→100→200→400 건너뜀) |
| `type.scale.caption.letterSpacing` | `0.4` (단위 미기재, px 가정) |

### TASK-10 하드코딩 감사 (2026-07-06)

`grep -rEoh "fontSize: [0-9]+" src/components src/app --include="*.tsx"` 등으로 실사용 분포를 수집한 결과.
전면 재설계 대신 기존 스케일에 진짜 누락분만 추가(`--text-subtitle`, `--spacing-1-5`, `--spacing-2-5`)했고,
아래는 stage 2(적용 감사 + 치환)에서 처리할 드리프트 수렴 대상이다 — 시각 변화가 생기므로 이 표만
보고 기계적으로 치환하지 말 것, 각 치환 PR에서 개별 검토·스크린샷 확인 필요.

| 항목 | 실사용 건수 | 수렴 후보 | 비고 |
|------|------------|----------|------|
| `borderRadius: 10` | 34곳 | `--radius-lg`(8) 또는 `--radius-xl`(12) | 카드류에 8/10/12가 혼용 중 — 어느 쪽으로 모을지 stage 2에서 결정 |
| `borderRadius: 99` | 19곳 | `--radius-full`(999) | pill의 이형 표기, 의미상 완전 동일 |
| `borderRadius: 14/16/18` | 5+10+1곳 | `--radius-xl`(12) 또는 신규 검토 | `16`이 10곳으로 제법 많음 — stage 2에서 신규 토큰 여부 판단 |
| `fontSize: 15` | 33곳(18개 파일) | — (토큰화 완료) | `--text-subtitle` 추가로 해소, 이번 PR에 포함 |
| `fontSize: 7/8/17/19/21/23/26/28/40` | 각 10곳 미만 | 해당 없음 | 아이콘 배지·헤딩 변형 등 일회성 — 토큰화 보류, 개별 판단 |
| `gap: 6` | 41곳 | — (토큰화 완료) | `--spacing-1-5` 추가로 해소 |
| `gap: 10` | 31곳 | — (토큰화 완료) | `--spacing-2-5` 추가로 해소 |
| `gap: 2/5/7/14/18` | 각 10곳 내외 | 인접 spacing 토큰 | 실사용 적어 stage 2에서 케이스별 수렴 |
