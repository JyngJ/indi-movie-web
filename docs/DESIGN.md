# 디자인 시스템

> 예술영화관 상영 통합 조회 서비스 — 디자인 토큰 & 컴포넌트 가이드

**참조 디자인 파일**: [Component Sheet](https://api.anthropic.com/v1/design/h/ow-AXB53evLzQZy0pDSN7A?open_file=Component+Sheet.html)

---

## 디자인 토큰 위치

```
src/styles/tokens.css   ← 모든 토큰의 단일 소스
```

**원칙**:
- 컴포넌트에서 hex 하드코딩 절대 금지
- 모든 색상, 간격, 타이포그래피는 CSS 변수 참조
- Figma 변수 네이밍과 코드 네이밍 일치

---

## 색상 토큰

### 라이트 모드 (`:root`)

| 토큰 | 값 | 용도 |
|------|----|------|
| `--color-primary-base` | `#2C3E50` | 주요 브랜드 색 |
| `--color-primary-light` | `#34495E` | 호버 상태 |
| `--color-primary-muted` | `#7F8C8D` | 비활성 상태 |
| `--color-surface-bg` | `#F8F7F2` | 페이지 배경 |
| `--color-surface-card` | `#FFFFFF` | 카드/패널 배경 |
| `--color-text-primary` | `#1A1A1A` | 본문 텍스트 |
| `--color-text-secondary` | `#555555` | 보조 텍스트 |
| `--color-text-disabled` | `#AAAAAA` | 비활성 텍스트 |
| `--color-border` | `#E0DDD6` | 기본 테두리 |
| `--color-accent` | `#C0392B` | 강조 (예: 배지) |
| `--color-success` | `#27AE60` | 성공 상태 |
| `--color-error` | `#E74C3C` | 에러 상태 |

### 다크 모드 (`[data-theme="dark"]`)

동일 토큰명, 다른 값으로 오버라이드.  
자세한 값은 `src/styles/tokens.css` 참조.

---

## 타이포그래피

### 폰트 패밀리

| 토큰 | 폰트 | 용도 |
|------|------|------|
| `--font-sans` | Pretendard | UI 본문, 버튼, 라벨 |
| `--font-serif` | RIDIBatang / Libre Baskerville | 제목, 영화 타이틀 |
| `--font-mono` | Courier New | 코드, 시간 표시 |

### 폰트 크기

| 토큰 | 크기 | 용도 |
|------|------|------|
| `--text-xs` | 11px | 캡션, 태그 |
| `--text-sm` | 13px | 보조 텍스트 |
| `--text-base` | 15px | 본문 |
| `--text-md` | 17px | 강조 본문 |
| `--text-lg` | 19px | 소제목 |
| `--text-xl` | 22px | 제목 |
| `--text-2xl` | 26px | 대제목 |
| `--text-3xl` | 32px | 히어로 제목 |

---

## 간격 시스템 (8px 기준)

| 토큰 | 값 |
|------|----|
| `--spacing-1` | 4px |
| `--spacing-2` | 8px |
| `--spacing-3` | 12px |
| `--spacing-4` | 16px |
| `--spacing-6` | 24px |
| `--spacing-8` | 32px |
| `--spacing-12` | 48px |
| `--spacing-16` | 64px |

---

## 레이아웃

| 토큰 | 값 | 설명 |
|------|----|------|
| `--max-width-mobile` | 480px | 데스크톱에서 중앙 정렬 |
| `--header-height` | 56px | 헤더 고정 높이 |
| `--bottom-nav-height` | 60px | 하단 네비 높이 |
| `--touch-target` | 44px | 최소 터치 영역 (iOS HIG) |

### Safe Area

```css
/* iOS 노치/홈 인디케이터 대응 */
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

### 100dvh (iOS Safari 주소창 이슈 방지)

```css
/* ❌ 사용 금지 */
height: 100vh;

/* ✅ 사용 */
height: 100dvh;
min-height: 100dvh;
```

---

## 컴포넌트 체계

### Primitive 컴포넌트 (`src/components/primitives/`)

비즈니스 로직 없이 디자인 토큰만 참조.

| 컴포넌트 | 설명 |
|---------|------|
| `Button` | 기본/보조/텍스트 버튼 |
| `Input` | 텍스트 입력 |
| `Chip` | 필터/태그 칩 |
| `Card` | 기본 카드 컨테이너 |
| `Badge` | 배지/라벨 |
| `Skeleton` | 로딩 스켈레톤 |

### Domain 컴포넌트 (`src/components/domain/`)

Primitive 조합 + 비즈니스 로직.

| 컴포넌트 | 설명 |
|---------|------|
| `TheaterCard` | 극장 목록 카드 |
| `TheaterPin` | 지도 마커 |
| `MovieCard` | 영화 카드 (포스터 + 정보) |
| `ShowtimeCell` | 상영시간 셀 |
| `DatePicker` | 날짜 선택 UI |

### 컴포넌트 작성 규칙

- props는 명시적 TypeScript interface
- `any` 금지
- 파일 하나당 컴포넌트 하나
- 100줄 넘으면 분리

---

## 다크/라이트 모드

### 동작 방식

```
시스템 설정 (prefers-color-scheme)
  ↓ 첫 진입 시
storageAdapter.getItem('movie-app-theme')
  ↓ 없으면 시스템 설정 적용
document.documentElement.setAttribute('data-theme', 'dark' | 'light')
```

### FOUC 방지

`src/app/layout.tsx`의 `<head>`에 인라인 스크립트로 렌더링 전 테마 적용.  
→ `src/store/themeStore.ts`의 `initTheme()` 참조.

### 전환

```ts
const { setTheme } = useThemeStore()
setTheme('dark')   // 다크
setTheme('light')  // 라이트
setTheme('system') // 시스템 설정 추종
```
