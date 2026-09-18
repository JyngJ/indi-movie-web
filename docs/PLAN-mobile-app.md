# 앱 전환 계획 (2026-09-18 정리)

흩어져 있던 앱 관련 결정과 자료를 모았다. 출처: `docs/ARCHITECTURE.md`(플랫폼 전략·어댑터), 계정 로드맵(2026-08-16 확정), 2026-09 Codex 세션(앱 전환·광고 검토), 코드 실측.

---

## 1. 이미 정해진 것

- **순서**: 계정 시스템(P1~P3) → P4~P7 → 앱. 앱으로 가는 명분은 iOS 푸시(웹푸시는 iOS PWA 제약으로 안 함).
- **패키징 후보**: React Native(Expo) 또는 Capacitor. `ARCHITECTURE.md` 플랫폼 전략.
- **어댑터 패턴**: 브라우저 API 직접 의존 금지. `src/lib/adapters/`에 `location`·`storage`·`share`·`cookieStorage` 구현됨.
- **알림 채널**: `NotificationSender` 인터페이스(`src/lib/notifications/dispatch.ts`) 뒤에 카카오 '나에게 보내기' + 이메일 폴백. 앱에서는 FCM/APNs 어댑터를 추가하는 구조.

## 2. 현재 상태

| 항목 | 상태 |
| --- | --- |
| P1 인증 | 머지. 카카오 직접 OIDC(`/auth/kakao/start`·`callback`) + 구글 Supabase OAuth |
| P2 관심 | 머지 |
| P3 알림 | 머지(#315). 카카오 발송 스위치는 꺼진 상태로 확인 필요 |
| P4~P7 | 미착수 |
| 어댑터 우회 | `localStorage` 직접 사용 3개 파일, `window.location` 직접 사용 15개 파일 |
| 공개 API | `/api/public/*` 14개 라우트 |
| 딥링크 파일 | `apple-app-site-association`·`assetlinks.json` 없음 |
| 회차 공유 URL | 경로형(`/movie/[id]/s/[showtimeId]`, #362) — 앱 링크 매핑에 유리 |

## 3. 이용 지표 (Codex 세션, GA 8/19~9/15)

- 조회 18,560 · 활성 사용자 5,843 · 사용자당 참여 52초
- 기기: Android 약 60% · iOS 약 24%
- PostHog(30일): 예매 링크 클릭 590 · 예매 사이트 복귀 340
- GA와 PostHog 조회수가 2배 차이(18,560 vs 8,685). PostHog가 클라이언트 경로 이동을 놓치는 설정으로 의심, 미확인

## 4. 기술 선택 기준

| | Capacitor | Expo / React Native |
| --- | --- | --- |
| 재사용 | 기존 웹 화면 대부분 | 도메인·데이터 로직만. 화면 재작성 |
| 지도 | Leaflet + CARTO 그대로 | `react-native-maps` + CARTO `UrlTile`. 카카오·네이버·구글 타일은 약관상 불가(AGENTS.md) |
| 추정 기간 | 시제품 이후 4~8주 | 시제품 이후 8~12주 이상 |
| 제약 | Next 서버 의존(인증 콜백·API·ISR) — 정적 번들 불가. `server.url` 원격 로드는 운영 비권장 | 웹과 화면 이중 관리 |
| 심사 | Apple 4.2(웹 포장만으로는 거절 가능) 대비 필요 | 해당 없음 |

결정은 2단계 시제품 결과로 한다.

## 5. 단계

### 0단계 — 선행 정리 (코드, 앱 착수 전)

1. PostHog 경로 이동 수집 설정 확인·수정 — 앱 전후 비교 기준
2. 어댑터 우회 정리 — `localStorage` 3개 파일, `window.location` 15개 파일 중 앱에서 문제되는 것(외부 이동·뒤로가기·쿼리 읽기)
3. 공개 API 목록·응답 형식 고정. 앱이 쓸 엔드포인트에 버전 또는 호환 규칙
4. 인증을 앱에서 받는 방식 설계 — 카카오 OIDC 콜백이 서버 라우트라 딥링크 복귀(`myapp://auth/callback`) 필요
5. 딥링크 파일 — `public/.well-known/apple-app-site-association`, `assetlinks.json`

### 1단계 — 핵심 흐름 시제품 (1~2주)

검증 흐름 하나: 영화 찾기 → 회차 선택 → 외부 예매 → 앱 복귀 → 같은 위치 유지. 여기에 카카오 로그인 왕복, 위치 권한, 지도 이동. Android 우선, iOS 로그인·복귀 동시 확인.

완료 기준: 로그인·외부 이동·상태 복원이 양쪽 실기기에서 동작.

### 2단계 — 기술 선택 후 출시용 구현

4절 기준으로 결정.

### 3단계 — 설치 이유

1. 관심 영화 새 회차 푸시 — P3 채널 인터페이스에 FCM/APNs 어댑터, 기기 토큰 테이블
2. 관심 목록 바로 열기
3. 예매 복귀 시 선택 회차 유지
4. 캘린더 추가·공유 링크로 앱 열기
5. 오프라인에서 저장 목록 보기(갱신 시각 표시)

### 4단계 — 출시 준비

- 계정: Apple Developer(연 $99), Google Play Console($25 1회)
- **Google Play 신규 개인 계정: 비공개 테스트 12명 · 연속 14일** 필요
- **Apple 4.8: 소셜 로그인 제공 시 Apple 로그인 추가 검토**
- 로그인 세션 보관·갱신·로그아웃·계정 삭제(스토어 필수)
- 개인정보처리방침 재개정 — AdMob·ATT(iOS 추적 동의)·푸시 토큰
- Play 데이터 보안 섹션, App Store 개인정보 라벨
- 강제 종료·복귀·네트워크 단절·뒤로가기 검증

## 6. 광고 (앱)

- 앱은 AdSense가 아니라 AdMob. 복귀 시점용 App Open 광고 형식 있음
- 콘텐츠 사용 중 뒤늦게 덮는 방식은 AdMob 권장 구현과 맞지 않음
- Codex 추정: 복귀 광고만으로 월 수백~수천 원. 앱 개발비 회수 근거 없음

## 7. 결정 필요

- 앱을 P4~P7보다 먼저 할지(로드맵상 P4~P7 이후)
- Capacitor / Expo — 1단계 시제품 후
- Apple 로그인 추가 여부
- 앱 전용 기능 범위(3단계 중 무엇까지 1차 출시에 넣을지)
