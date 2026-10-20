# 이메일 소식 성과 측정

대시보드: https://us.posthog.com/project/433269/dashboard/2230849

## 집계 기준

- 발송 성공 인원: `email digest sent`의 가명 수신자별 고유 인원. Gmail 요청 수락 기준이며 수신함 도착은 확인하지 못한다.
- 발송 성공 건수: 위 이벤트의 `delivery_id` 고유값. 반복 동기화 이벤트 원시 개수를 사용하지 않는다.
- 추정 열람률: `email digest opened`의 고유 발송분 / `email digest sent`의 고유 발송분. 이미지를 차단하면 누락되고 자동 로드하면 부풀 수 있다. 분모가 없으면 산출하지 않는다.
- `email digest clicked`는 보안 스캐너도 포함할 수 있는 링크 요청이다. 실제 서비스 방문은 브라우저의 `email entry`로 구분한다.
- 메일 유입 인원: `email entry` 고유 방문자. JS·쿠키 차단, 전달받은 링크, 기기 차이의 영향을 받는다.
- 예매 버튼 클릭자: `booking clicked` 중 `email_campaign`이 있는 고유 방문자. 쿠키 발급 시각부터 30분만 연결한다. 실제 예매 완료를 뜻하지 않는다.
- 발송·열람·링크 요청은 **원래 발송일** 기준으로 집계한다. 실제 요청 시각은 `observed_at`이다. 웹 방문·예매 클릭은 실제 발생일 기준이다.
- 내부 테스트 계정을 자동으로 제외하지 않는다. 가명 수신자와 웹 계정을 연결하지 않으므로 발송·방문 지표의 분모를 합쳐 전환율로 계산하지 않는다.
- Data Catalog 권한이 없어 참고 지표로 관리하며 승인된 공식 지표라고 부르지 않는다.

## 배포와 설정

1. PR을 main에 반영하고 Vercel Production 배포를 확인한다. 새 `/api/email-notifications/track` 경로가 있어야 한다.
2. 기존 `NEXT_PUBLIC_POSTHOG_TOKEN`, `EMAIL_NOTIFICATION_TOKEN_SECRET`를 사용한다. DB 변경·신규 업체 가입은 없다.
3. 서버는 Production에서 기본 활성화한다. Preview·개발에서는 꺼져 있다. `EMAIL_ANALYTICS_ENABLED=false`로 수집을 중단할 수 있다. 로컬 테스트는 명시적으로 `true`로 켠다.
4. GitHub 발송 작업은 `NEXT_PUBLIC_POSTHOG_TOKEN` secret을 사용하고 `EMAIL_ANALYTICS_ENABLED=true`를 전달한다.
5. 발송 자동화 자체는 기존 `EMAIL_NOTIFICATION_DELIVERY_ENABLED` 변수로 별도 제어한다. 이 PR은 정기 발송을 켜지 않는다.
6. 배포 후 실제 발송분부터 집계한다. 기존 인증 메일·발송 이력을 열람한 것으로 소급하지 않는다. 첫 운영 발송 전의 0은 실적 비교에 사용하지 않는다.

## 실패와 개인정보

- 계측은 발송 성공을 되돌리지 않는다. 재시도 때문에 같은 메일을 다시 보내지 않는다.
- 발송 작업 뒤 `scripts/sync-email-analytics.ts --send`가 최근 30일의 계측된 발송 성공분만 재전송한다. `--send`가 없으면 조회만 한다. 열람 요청의 순간적인 통계 실패는 복원할 수 없다.
- 고유 발송분으로 집계하므로 재전송한 통계는 중복으로 세지 않는다.
- 링크 이동·이미지 응답은 먼저 반환하고 `after`에서 계측한다. 저장소·PostHog 응답을 기다리지 않는다.
- 링크는 HMAC 서명·유효기간을 검사하고 서비스의 상영 탐색 경로만 연다. 인증·해지 링크는 계측 링크로 바꾸지 않는다.
- 열람·링크 요청은 발송 성공 기록과 현재 활성 구독의 revision이 일치할 때만 PostHog로 보낸다.
- 주소·계정 ID·인증 토큰·IP·User-Agent를 서버 이벤트에 넣지 않는다. 가명 수신자 ID와 임의 발송 ID를 사용한다.
- 목적지 URL·브라우저 쿠키에는 발송일만 있고 개별 발송 ID는 없다. `Referrer-Policy: no-referrer`, `Cache-Control: no-store`를 사용한다.

공식 API 참고: https://posthog.com/docs/api/capture
