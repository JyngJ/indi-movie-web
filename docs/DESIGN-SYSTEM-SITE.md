# 디자인 시스템 사이트 (`/design-system`)

코드와 피그마에서 **생성**하는 디자인 시스템 문서. 손으로 쓰는 페이지가 아니다.

```
src/styles/tokens.css ─┐
피그마 덤프 state.json ─┼─→ npm run ds:build ─→ src/design-system/manifest.json ─→ /design-system
primitives/*.tsx ──────┘        (커밋 대상)
```

## 왜 생성하나

값의 진실이 세 군데(코드 토큰 · 피그마 변수 · 문서)에 흩어져 있으면 문서가 가장 먼저 낡는다.
매니페스트는 앞의 둘을 읽어 합치고, 어긋난 것을 `drift`로 남긴다. 사이트는 그 JSON만 렌더한다.

## 업데이트 절차

1. 피그마를 고쳤으면 Scripter에서 `dump-state` 실행 → `~/.claude/skills/figma-scripter-sync/figma-dump/state.json` 갱신
2. `npm run ds:build` — 덤프가 없으면 코드만으로 빌드하고 경고한다. 다른 경로면 `DUMP=/path/state.json npm run ds:build`
3. `git diff src/design-system/manifest.json`으로 무엇이 바뀌었는지 확인 후 커밋
4. `/design-system/drift`에서 새로 생긴 차이를 처리

## 구성

| 경로 | 내용 |
| --- | --- |
| `/design-system` | 개요 · 원칙 · 토큰 3계층 · 생성 파이프라인 · 차이 요약 |
| `/design-system/foundations/color` | 이름 규칙 · 원시 램프(피그마 컬렉션) · 시맨틱 표 |
| `/design-system/foundations/typography` | Typeface · 스케일 견본(피그마 실측) · 코드 토큰 · Usage |
| `/design-system/foundations/spacing` | 4배수 스케일 · Gutter 중첩 규칙 · Usage |
| `/design-system/foundations/radius` | 역할 기반 반경 · Usage |
| `/design-system/foundations/elevation` | 그림자 단계 · 피그마 이펙트 · Usage |
| `/design-system/foundations/writing` | 라이팅 규범 — 목소리 · 자리별 톤 · 어미 · 표기 · 자리별 문구 · 용어 (원본 `src/design-system/writing.ts`, 손으로 적는 유일한 Foundations) |
| `/design-system/components` | 프리미티브 목록(문서화됨 / 목록만) |
| `/design-system/components/[name]` | Anatomy · State(조작 가능) · Properties · Spec · Usage · 피그마 실측 · 소스 |
| `/design-system/drift` | 코드 ↔ 피그마 차이 (종류별) |

## 페이지 문법 (코드잇 디자인 시스템 참고)

컴포넌트 상세는 여섯 블록을 순서대로 쌓는다:

1. **Anatomy** — 견본 하나 + 번호 콜아웃, 아래에 ESSENTIAL/OPTIONAL 파트 설명
2. **State** — 좌 무대 / 우 Control 패널. 실제 컴포넌트가 컨트롤에 반응한다
3. **Properties** — 피그마 배리언트 축 + TS props
4. **Spec** — 좌 견본 / 우 설명 (크기·여백·예외 규칙)
5. **Usage** — Do / Don't 2단 카드
6. **피그마 · 소스** — 배리언트 실측표(앞 24개)와 파일 경로

앞의 3·6번은 매니페스트에서 생성되고, 1·2·4·5번의 문장은 `src/design-system/guides.ts`,
그림은 `src/app/design-system/_ui/componentDocs.tsx`에 손으로 적는다.

라이팅 규범은 생성할 수 없는 유일한 층이다 — `src/design-system/writing.ts`가 원본이고
`/design-system/foundations/writing`과 `/design-system/llms-writing.txt`가 그것을 렌더한다. 규칙을 고칠 땐 파일 하나만 고친다.

## 규칙

- **미리보기는 제품 컴포넌트를 그대로 import한다.** 문서용 사본을 만들면 그 사본이 넷째 진실이 된다.
  데모는 `src/app/design-system/_ui/demos.tsx` 한 곳에만 적는다.
- **매니페스트를 손으로 고치지 않는다.** 값이 틀렸으면 tokens.css나 피그마를 고치고 다시 빌드한다.
- 컴포넌트 이름이 피그마 세트와 다르면 `build-manifest.mjs`의 `FIGMA_ALIAS`에 적는다.
- `src/app/design-system`은 `npm run audit:ui` 대상에서 제외된다 — 토큰 자체를 전시하는 화면이라
  값을 리터럴로 그려야 한다(램프를 보여주는 자리는 1계층을 직접 쓴다는 tokens.css 규칙과 같은 이유).
- 지금은 `robots: noindex`. 포트폴리오로 공개할 때 `src/app/design-system/layout.tsx`에서 풀면 된다.

## drift 종류

| kind | 뜻 | 대응 |
| --- | --- | --- |
| `token-value` | 같은 이름인데 값이 다름 | 즉시 맞춘다. 0이어야 한다 |
| `figma-only` | 피그마에만 있는 변수 | 쓸 때 tokens.css로 내린다 |
| `type-scale` | 2.0 타입 스케일(10·12·14·16·20·24) 밖 크기 | 스타일을 만들거나 스케일 안으로 |
| `component-unmapped` | 피그마 컴포넌트 세트 없음 | 시안을 그리거나 `FIGMA_ALIAS` 등록 |
