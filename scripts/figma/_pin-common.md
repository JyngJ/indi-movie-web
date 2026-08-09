# 핀 시안 스크립트 공통 규칙 (2026-08-10)

두 스크립트(`gv-pins-tobe-*.js`, `poster-pins-*.js`)가 같은 함정을 반복해서 밟아서 정리해 둔다.

## 1. 색은 2.0 컬렉션에서만 찾는다

파일에 컬렉션이 셋 있고, 레거시 두 개가 1.0 색을 들고 있다.

| 컬렉션 | 성격 | 예 |
| --- | --- | --- |
| `Primitives` | 1.0 원시값 | `primary/base` = **#4A6380** (구 블루) |
| `Semantic` | 1.0 시맨틱(별칭) | `surface/card`, `text/caption` |
| `영화볼지도 색상 - 2.0` | **현행** | `primary/700` = #404E81 |

`primary/base`·`surface/card`·`text/caption`·`on-accent`는 **2.0에 없다**. 이름으로 훑으면
레거시가 잡혀서 지도 핀 칩이 구 블루(#4A6380)로 나갔다. 그래서 `paint()`는 2.0 컬렉션만 본다.

치환표:

| 쓰고 싶던 이름 | 2.0 실제 이름 |
| --- | --- |
| `primary/base` | `primary/700` |
| `surface/card` | `white` |
| `surface/bg` | `neutral/100` |
| `border` | `neutral/200` |
| `text/primary` | `neutral/900` |
| `text/sub` | `neutral/600` |
| `text/caption` | `neutral/500` |
| `on-accent` | `white` |
| `gv` | `gv/900` |
| `error` | `error/900` |

## 2. 꼬리는 회전 사각형이 아니라 삼각형

`rectangle.rotation = 45`는 원점(좌상단) 기준으로 돌아서, 계산해 둔 x/y와 실제 위치가 어긋난다.
실제로 카드 위에 마름모가 붕 뜬 채로 나왔다. `figma.createPolygon()`(3각) 을 카드 **뒤에** 깔고
밑변을 카드에 겹쳐서 밑변 보더를 가린다.

## 3. 섹션 안에 절대 좌표로 배치하지 않는다

섹션 자식의 x/y는 페이지 절대 좌표다. 스크립트를 다시 돌릴 때마다 섹션 위치가 바뀌면
라벨·세트·노트가 제각각 흩어진다. **섹션 안에 루트 오토 레이아웃 프레임 하나**를 두고
모든 내용을 그 안에 쌓는다. 좌표를 만지는 곳은 루트 프레임 하나뿐.

## 4. 프레임 → 컴포넌트는 `createComponentFromNode`

자식만 새 컴포넌트로 옮기면 패딩·fill·radius·이펙트가 날아간다(`2.0/GvChip`이 31×14로 찌그러졌던 원인).

## 5. 스타일 이름

- 텍스트: `2.0/title` `2.0/body-strong` `2.0/body` `2.0/meta` `2.0/caption` `2.0/label` `2.0/num/time` `2.0/num/seat`
- 이펙트: `2.0/shadow/sm` `2.0/shadow/md` `2.0/shadow/lg` `2.0/shadow/sheet` `2.0/shadow/pin` `2.0/shadow/inset`
- 스페이싱: `spacing/1`(4) … `spacing/32`(128) · 래디우스: `radius/poster`(2) `radius/badge`(4) `radius/button`(8) `radius/control`(12) `radius/popover`(16) `radius/sheet`(20) `radius/pill`
