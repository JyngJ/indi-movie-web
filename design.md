# Design System (Astryx)

## Iconography System
- **Library**: [Lucide React](https://lucide.dev/)
- **Stroke Width**: `1.75` (기존의 얇고 모던한 UI 톤앤매너에 맞추어 1.75를 표준으로 사용합니다.)
- **Sizes**:
  - `14px` ~ `16px`: 캡션, 툴팁, 버튼 내부 등 작은 요소
  - `20px` ~ `24px`: 글로벌 네비게이션(탭바), 모달 헤더, 주요 리스트 아이콘
- **Color Rules**:
  - **색상 하드코딩 절대 금지**: 아이콘의 색상은 무조건 부모 요소의 텍스트 색상을 상속받도록 `color="currentColor"` (또는 Tailwind의 `text-current`)를 활용합니다.
  - 예시: `<Film size={20} strokeWidth={1.75} className="text-current" />`
  - 이를 통해 다크모드 등 테마가 변경되어도 아이콘 색상이 자동으로 전환되게 합니다.

## Components
- **Primitives**: UI 구성의 기본이 되는 조립형 컴포넌트(`HoverPopup`, `ScrollNavButton`, `SectionHeader`, `GenreChip` 등)를 적극 사용하여 AI-Vibe(매직 넘버, 과도한 Glassmorphism, 의미없는 거대 그림자)를 지양합니다.
