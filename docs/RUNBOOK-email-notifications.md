# 상영 알림 이메일 운영

## 구성과 기본값

- 발신: `indi.movie.map@gmail.com`
- 한국 시간 월·금 09:00, 실패한 작업은 10:00·11:00 재시도
- 소식이 없으면 발송하지 않음
- 빈도 의견 자동 요청은 보류. 화면·저장 기능은 유지하고, 이용자가 모이면 일괄 설문한다
- 웹 팝업과 실제 요약 발송은 각각 기본 비활성
- 뉴스레터·이메일 로그인은 제외. Google 로그인 버튼은 기존 OAuth 연결을 사용한다

## 설정 순서

1. 운영 DB에 `docs/SUPABASE_EMAIL_NOTIFICATIONS.sql`을 적용한다. 모든 테이블의 RLS와 클라이언트 직접 접근 차단을 유지한다.
2. Google Cloud에서 Gmail API를 활성화한다. 발신 계정 소유자가 OAuth를 통해 `https://www.googleapis.com/auth/gmail.send` 권한을 허용하고 오프라인 접근용 refresh token을 발급한다. 읽기·삭제 권한은 필요 없다. 테스트 상태의 OAuth 앱에서는 토큰 유효기간 제약이 있으므로 운영 상태를 확인한다.
3. 웹 환경에 아래 값을 설정한다. 비밀 값은 클라이언트 코드·저장소·채팅에 넣지 않는다.
4. 내부 회원 계정으로 주소 등록 → 인증 → 메일 수신 → 해지를 확인한다.
5. GitHub 저장소의 Secrets·Variables를 설정하고, 배포와 함께 활성화한다.

| 환경 변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 배포 사이트의 HTTPS 주소. 인증·메일 링크·요청 Origin 검증에 사용 |
| `NEXT_PUBLIC_SUPABASE_URL` | 기존 DB 주소 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 웹의 기존 로그인 검증용 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버·발송 작업의 DB 접근 키 |
| `GMAIL_CLIENT_ID` | 발신 계정용 OAuth 앱 ID |
| `GMAIL_CLIENT_SECRET` | OAuth 앱 비밀 값 |
| `GMAIL_REFRESH_TOKEN` | 발신 계정이 허용한 오프라인 발송 권한 |
| `EMAIL_NOTIFICATION_TOKEN_SECRET` | 32자 이상의 임의 비밀 값. 모든 환경의 관리 링크 서명에 동일하게 사용 |
| `NEXT_PUBLIC_EMAIL_NOTIFICATIONS_ENABLED` | 웹 팝업·설정 활성화. `true`로 바꿀 때 재빌드 필요 |
| `EMAIL_NOTIFICATION_DELIVERY_ENABLED` | 정기 요약 실제 발송 허용. `true`일 때만 `--send`가 작동 |

관리 링크 서명 키를 바꾸면 이전 메일의 관리 링크는 무효가 된다. 링크를 유지하려면 키를 안정적으로 보관한다.

OAuth 토큰은 반드시 `indi.movie.map@gmail.com`으로 발급한다. 다른 계정의 토큰을 넣으면 Gmail의 실제 발신 주소가 달라질 수 있다. 발신 주소는 코드에 고정돼 있다.

참고: [Gmail 발송 API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send), [Google 오프라인 OAuth](https://developers.google.com/identity/protocols/oauth2/web-server#offline).

## 정기 실행

`.github/workflows/email-notifications.yml`은 UTC 월·금 00:00·01:00·02:00에 실행한다. 같은 날짜는 하나의 발송 슬롯이므로, 이미 보낸 사람에게 10:00·11:00에 다시 보내지 않는다. GitHub 예약은 지연될 수 있다. 한국 시간 정오 이후 또는 월·금 이외에는 새 작업을 만들지 않는다.

저장소 Variables:

- `EMAIL_NOTIFICATION_DELIVERY_ENABLED=true`
- `NEXT_PUBLIC_SITE_URL`

저장소 Secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `EMAIL_NOTIFICATION_TOKEN_SECRET`

기존 관심 소식 생성 배치는 계속 실행돼야 한다. 이메일 작업은 `notification_events`를 소비하며 직접 새 상영 판정을 생성하지 않는다.

로컬 조회만: `npm run notify:email`. 실제 발송: `npm run notify:email -- --send`. 모두 발송 시간 창을 따른다. 조회 모드에서는 인증·해지용 토큰이나 발송 이력을 만들지 않는다.

## 발송 상태와 재시도

| 상태 | 처리 |
| --- | --- |
| pending | 전송 대기 |
| sending | 작업 선점 완료. 정상적으로는 곧 sent로 바뀜 |
| sent | Gmail이 전송 요청을 수락. 수신함 도착 보장은 아님 |
| failed | 확실히 거절된 전송. 생성 후 12시간 내 최대 3번 시도 |
| unknown | 전송 결과 불확실. 같은 사용자에게 후속 발송도 보류 |
| skipped | 주소 변경·해지 등으로 발송 취소 |

`sending` 상태로 작업이 멈춘 경우에도 자동 재전송하지 않는다. Gmail 보낸편지함에서 해당 Message-ID를 찾아 실제 전송 여부를 확인한다. `unknown`이나 멈춘 `sending`이 실제 발송됐다면 `complete_email_notification_delivery`로 성공 기록과 횟수를 함께 반영한다. 이때 함수가 처리할 수 있도록 상태를 `sending`으로 맞춘 뒤 실행한다. 발송되지 않았음이 확인된 경우에만 `failed` 또는 `skipped`로 전환한다. `sent_count`를 따로 수정하지 않는다.

수신 주소가 동일한 여러 계정은 각각의 관심 목록·동의를 가진 별도 구독으로 취급한다. 따라서 같은 주소로 메일이 여러 통 갈 수 있다. 주소만으로 계정을 합치지 않는다.

## 반송·신고와 Gmail 운영 한계

Gmail 발송만 사용하는 초기 버전에는 자동 반송 웹훅이 없다. 운영자는 발신 계정의 반송·신고·수신 거부 요청을 확인한다. 발송 중단은 알림 설정·메일 해지 링크 또는 아래 관리 스크립트로 처리한다.

`SUPPRESS_EMAIL_ADDRESS`를 로컬 비밀 환경에 설정한 뒤 `npx tsx --env-file=.env.local scripts/suppress-email.ts`를 실행하면 같은 주소의 모든 구독을 중단한다. 스크립트는 이메일 주소를 로그에 출력하지 않는다.

일반 Gmail의 발송 한도·반송 수동 처리 때문에 규모가 커지면 전용 발송 업체로 어댑터를 교체해야 한다. 발송량 증가 전에 [Gmail 발송 한도](https://support.google.com/mail/answer/22839)를 확인한다.

## 검증

- `npx vitest run src/lib/emailNotifications`
- `npx tsc --noEmit`
- `npm run audit:ui:check`
- `npm run audit:writing:check`
- `npm run audit:feedback:check`
- `npm run build` (webpack)

분리된 PostgreSQL 테스트 DB에 스키마를 적용하고 `scripts/tests/email-notifications.sql`을 실행하면 인증 만료·재사용·재요청 제한, 중복 선점·완료, 해지·불확실 전송 차단, 접근 권한을 검증한다. 이 테스트는 운영 DB에서 실행하지 않는다.


## 2026-10-19 설정 진행 상태

- 운영 DB에 `email_notification_subscriptions_and_delivery` 적용 완료. 이메일 두 테이블은 RLS 활성화, anon·authenticated 직접 접근 차단, service_role 접근을 확인했다.
- Gmail 토큰 갱신과 gmail.send 권한을 확인했다. 실제 발송·수신 테스트는 별도다.
- 서명 키는 로컬과 GitHub Secrets에 같은 값으로 등록했다. GitHub Variable의 정기 발송은 false다.
- Vercel 환경 변수 접근은 연결 도구의 프로젝트 범위 권한 오류(403)로 실패했다. 프로젝트 관리자가 동일 서명 키를 직접 추가해야 한다.
- 로컬 테스트 서버는 3001번 포트, 사이트 주소를 http://localhost:3001로 실행한다. 운영 사이트 주소는 변경하지 않았다.


## 로컬 Google 로그인 복귀

- Google OAuth 클라이언트의 JavaScript 원본 추가와 Supabase Redirect URLs 허용은 별도 설정이다.
- Supabase Auth → URL Configuration → Redirect URLs에 `http://localhost:3001/**`와 `http://localhost:3000/**`를 추가한다. Site URL은 운영 주소를 유지한다.
- 2026-10-19 독립 테스트 OAuth를 취소했을 때 로컬 요청도 운영 주소로 복귀하는 것을 확인했다. 도구에는 Auth 설정 수정 권한이 없어 관리자 화면에서 허용 목록을 저장해야 한다.
- AuthProvider는 초기 조회 실패·8초 초과 시 무한 로딩을 끝내고, BFCache pageshow 복원 시 재조회한다. LoginPanel도 외부 로그인 뒤로가기에서 이동 중 상태를 초기화한다. 이메일 설정 GET에는 10초 제한과 재시도 1회를 둔다.

## 2026-10-20 릴리스 준비 검증

- 전체 단위 테스트 526개·브라우저 계약 테스트 18개, webpack 배포 빌드, UI·라이팅·이동 피드백 검사 통과(최종 커밋 전 재검증).
- Docker 임시 PostgreSQL에서 스키마와 `scripts/tests/email-notifications.sql` 실행 완료. 인증 재요청 제한·만료·재사용·중복 선점·완료·해지·권한 검증 후 롤백했고 컨테이너를 제거했다. 운영 DB에서 이 SQL 검사를 실행하지 않았다.
- 운영 데이터를 읽기만 확인: 활성 구독 1명, 발송 후보 없음. 실제 상영 645개 영화×극장 조합을 읽어 소식 구성에 사용했고 메일·발송 이력을 만들지 않았다. 후보 없음은 등록 이후 유효한 새 관심 소식이 없다는 뜻이다.
- 디자인 테스트 메일 1회 수신 확인. 실제 관심 소식을 조합한 운영 발송·운영 해지는 배포 후 확인해야 한다.
- GitHub `NEXT_PUBLIC_SITE_URL` 누락을 보완했다. 정기 발송 Variable은 `false`로 유지했다.
- 사용자가 Google 인증 플랫폼 게시 상태를 ‘프로덕션’으로 확인했다.
- Vercel 환경 변수 목록은 프로젝트 scope 권한 오류(403)로 확인하지 못했다. Vercel CLI도 없어 관리자가 Production 범위 설정을 확인해야 한다. 비밀 값을 채팅으로 전달하지 않는다.
- Node.js 20에서는 현재 Supabase 라이브러리가 WebSocket 부족으로 실행되지 않는다. 패키지 실행 조건을 Node.js 22 이상으로 명시했고 발송 workflow도 22를 사용한다.
- 최신 메일 이미지는 `public/email/header-v3.png`, `footer-v3.png`만 사용한다. 예시용 극장·영화 목록과 테스트 수신 주소는 제품 코드에 포함하지 않았다.
- GV·특별전 자동 메일 연동은 이번 출시 범위에서 제외한다.

### 배포 전후 확인 순서

1. Vercel Production에 웹 기능 `NEXT_PUBLIC_EMAIL_NOTIFICATIONS_ENABLED=true`, HTTPS 운영 주소, Gmail 3개 키·관리 링크 서명 키·Supabase 서버 키가 있는지 확인한다. public 키 값과 비밀 키를 혼동하지 않는다. GitHub의 서명 키와 웹의 서명 키는 같아야 한다.
2. PR을 검토·병합해 배포한다. 정기 발송은 아직 켜지 않는다.
3. 운영 주소에서 Google 로그인·등록 팝업·이메일 기본값·입력 검증·거절·설정 이동을 확인한다.
4. 내부 계정으로 인증 메일·인증 완료·이미지 표시·영화 및 전체 상영 링크·답장·설정 및 해지까지 확인한다. 재인증이 필요한 경우 5분 재요청 제한을 따른다.
5. 실제 새 관심 소식이 생기면 발송 후보를 조회하고, 월·금 09:00~12:00 KST에 내부 계정 1건 발송을 확인한다. `--send`는 모든 활성 대상에 적용되므로 내부 계정 제한 없이 수동 테스트에 사용하지 않는다.
6. 운영 테스트가 끝난 뒤 GitHub Variable `EMAIL_NOTIFICATION_DELIVERY_ENABLED=true`로 전환한다. 첫 월·금 실행 결과와 반송을 확인한다.
