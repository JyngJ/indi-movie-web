# 크롤러 운영 런북 (Crawler Runbook)

좌석/상영시간표 크롤러의 운영, 장애 대응, IP 밴 복구 절차를 정리한다.

---

## 실행 환경

- **크롤러 서버:** Raspberry Pi (RPi). 접속 `ssh pi@100.76.84.97` (Tailscale 오버레이 IP — 공인 IP가 바뀌어도 유지됨).
- **레포 경로:** `/home/pi/movie` (추적 브랜치 `main`). 코드는 `main`에 머지돼야 다음 크론에서 반영된다.
- **환경변수:** RPi `/home/pi/movie/.env.local` (Supabase URL/service key 등). 모든 크롤 스크립트는 `tsx --env-file=.env.local ...` 로 실행.
  - `CRON_SECRET` — Vercel 환경변수와 **같은 값**. `crawl:showtimes`가 수집 뒤 `/api/revalidate`를 불러 상세 페이지 캐시(1시간 ISR)를 바로 갱신할 때 쓴다. 없으면 경고만 찍고 넘어가며, 그때는 시간표가 최대 1시간 늦게 반영된다(2026-09 추가).
- **네트워크:** RPi는 공인 IP를 `eth0`에 **직접** 받는다 (NAT 뒤 아님, KT 동적 DHCP). NetworkManager 관리, 연결명 `"Wired connection 1"`.

### crontab (2026-07-09 기준)

| 스케줄 | 작업 | 로그 |
|--------|------|------|
| `0 */3 * * *` | `npm run crawl:seats` | `seat.log` |
| `0 1,7,13 * * *` | `git pull` + `npm run crawl:showtimes` | `crawl.log` |
| `30 1,7,13 * * *` | `npm run crawl:curation` | `curation.log` |
| `0 6 * * 1` | `npm run curate:weekly-ranking` | `ranking.log` |
| `15 1,7,13 * * *` | `npm run notify:favorites` (관심 알림 — 상영시간표 크롤 직후) | `notify.log` |
| `0 */4 * * *` | `npm run check:crawl-health` | `health.log` |
| `0 * * * *` | `dtryx-ban-watch.sh` (밴 감시, 알림전용) | `dtryx-ban-watch.log` |
| `13 9 * * 1,5` (KST) | `npm run notify:email:dispatch` (소식 메일 워크플로 실행 — `RUNBOOK-email-notifications.md`) | `email-dispatch.log` |
| `30 4 * * *` | `npm run crawl:releases` (개봉 예정 수집 — 인디그라운드, 04시 pull 뒤. 2026-11-18 추가, `PLAN-indieground-releases.md`) | `releases.log` |

**등록 대기(PR 머지 후 사람이 추가):** 인기 랭킹 사전 집계. 먼저 Supabase에서 `supabase/seeds/18_click_rankings.sql`을 실행하고, 그다음 크론을 추가한다.

| 스케줄 | 작업 | 로그 |
|--------|------|------|
| `40 * * * *` | `npm run curate:click-rankings` (최근 7일 인기 랭킹 → `click_rankings`. 공개 API는 3시간보다 젊은 스냅샷만 읽고, 낡았을 때만 PostHog를 부른다) | `click-rankings.log` |

- 크론 없이도 공개 API는 동작한다. 다만 그때는 스냅샷이 3시간마다 낡아서, 그 뒤 첫 요청이 PostHog를 기다린다(최대 4.5초).
- 정각을 피한 이유: 매시 정각에는 다른 크론(`0 */3`, `0 */4`, `0 *`)이 몰린다.

`crawl:seats` / `crawl:showtimes` / `check:crawl-health` 는 각각 Discord 리포트를 전송한다 (webhook `DISCORD_REPORT_WEBHOOK_URL`).

---

## 2026-07-09 장애: dtryx IP 밴 + 좌석 0개 갱신

### 증상
- 좌석 크롤 결과 모든 고속 파서 극장이 `0개 좌석 갱신`.
- 이후 dtryx 계열 fetch 전량 `fetch failed` (`UND_ERR_CONNECT_TIMEOUT`). 좌석 크롤 성공 0 / 실패 56.

### 근본 원인 (좌석 최적화 커밋에서 유입)
1. **좌석 0개 매칭** — Dtryx API가 `ShowSeq`/`ScreenCd`를 **number**로 반환하는데, booking URL의 `searchParams.get()`(string)과 `===` 비교 → 항상 false → 모든 매칭 탈락.
2. **DB 날짜 문법 에러** — `.gte('show_date', '2026')` (연도 문자열)을 Postgres `date` 컬럼이 파싱 못 함 (`invalid input syntax for type date: "2026"`) → 후보 빈 배열.
3. **IP 밴** — 좌석 갱신에 과도한 병렬(`mapConcurrency(tasks, 3)` + 도메인 무시 `Promise.all`)로 dtryx에 순간 다량 요청 → dtryx 방화벽이 RPi 공인 IP를 차단 (ICMP는 통과, TCP 443만 드랍).

### 조치 (PR #176, `b0ba069`)
- `ShowSeq`/`ScreenCd`를 `String()` 정규화 후 비교.
- `.gte('show_date', todayDash)` (오늘 dash 포맷)으로 변경.
- dtryx 관련 동시성을 **전부 1**로 낮춤 (도메인당 순차). 브랜드(도메인) 그룹 간에만 `Promise.all` 병렬 유지 — IP당 버스트 없음.
- **`seat-checker` 폐기:** RPi에 있던 별도 스탠드얼론 좌석 크롤러(`/home/pi/seat-checker/index.mjs`, dtryx 전용, `mapConcurrent(tasks,3)` 무지성 병렬 = 밴 주범)를 삭제하고, movie repo의 `npm run crawl:seats`(전 파서 커버 + throttle + 픽스 반영)로 크론 교체.
- IP 밴 회피용 IP 로테이션 실행 (아래 절차). 222.108.235.221(밴) → 121.171.77.59(정상).

---

## 절차: dtryx IP 밴 감지 & 복구

### 1. 밴 여부 확인
```bash
ssh pi@100.76.84.97
# TCP 443이 막혔는지 (밴이면 timeout, 정상이면 즉시 연결)
timeout 8 bash -c "cat < /dev/null > /dev/tcp/www.dtryx.com/443" && echo OPEN || echo BLOCKED
# 대조: ping은 밴이어도 통과(ICMP 별개), 다른 사이트는 정상
```
`BLOCKED`(443 timeout)인데 `ping www.dtryx.com`은 되고 google 등 타 사이트는 정상이면 → **IP 밴 확정**.

### 2. 먼저 할 것 — 부하를 줄이고 연락한다

IP 로테이션은 **최후 수단이다.** 차단을 인식하고 IP를 바꿔 다시 접근한 기록은, 나중에
접근권한 다툼이 생기면 가장 불리한 사실로 남는다(대법원 2021도1533은 "객관적으로 드러난
여러 사정"으로 접근권한을 판단한다). 광고를 붙인 뒤에는 더 그렇다.

밴이 확정되면 순서대로:

1. **원인부터 줄인다** — 밴은 대부분 우리가 순간 요청을 몰아친 결과다. 도메인 동시성 1을
   지키고 있었는지, 좌석 크롤이 `Promise.all`로 새지 않았는지 확인한다(2026-07-09 사고 원인).
   크론 주기를 하루 3회에서 임시로 줄이는 것도 방법이다.
2. **기다린다** — 일시적 rate limit이면 시간이 지나면 풀린다. 최소 하루는 두고 본다.
3. **연락한다** — dtryx 고객센터나 해당 극장에 "상영 정보를 모아 관객을 예매 페이지로
   보내는 서비스이고, 하루 N회 조회한다. 부담되면 간격을 조정하겠다. 공식 제공 경로가
   있으면 그쪽을 쓰고 싶다"고 남긴다. 답이 없어도 **시도한 기록 자체가 방어 자료**다.
4. 위 셋으로 안 되고 서비스가 멈춰 있을 때만 아래 로테이션을 쓴다.

우리 크롤러는 UA에 사이트 주소와 메일을 싣는다(`CRAWLER_UA`). 상대가 우리를 특정해
연락할 수 있으니, 차단 전에 문의가 올 여지가 있다. 이 신원을 지우지 말 것.

### 3. IP 로테이션 (RPi 공인 IP 교체) — 최후 수단
```bash
ssh pi@100.76.84.97 'sudo systemd-run --unit=mac-rotate --collect /bin/bash /home/pi/mac-rotate.sh'
# ~20초 후 결과 확인
ssh pi@100.76.84.97 'tail -5 /home/pi/mac-change.log; curl -s https://api.ipify.org'
```
- `mac-rotate.sh` = `eth0` cloned-MAC을 랜덤(OUI `e4:5f:01` 유지)으로 바꿔 DHCP 새 lease → 새 공인 IP 획득.
- **자가복구 워치독 내장:** 150초 뒤 인터넷이 죽어 있으면 원래 하드웨어 MAC으로 자동 롤백.
- `systemd-run`으로 detached 실행 → SSH 세션이 끊겨도 계속 진행. SSH는 Tailscale 오버레이(`100.76.84.97`)라 공인 IP가 바뀌어도 유지됨.
- 로그에 `dtryx:443 OPEN - 밴 회피 성공!` 뜨면 완료.

### 4. MAC 원복 (필요 시)
```bash
ssh pi@100.76.84.97 'nmcli con mod "Wired connection 1" 802-3-ethernet.cloned-mac-address "" && nmcli con up "Wired connection 1"'
```
빈 값 = 영구 하드웨어 MAC으로 복귀. (cloned MAC은 재부팅해도 NM이 유지하므로, 원복하려면 명시적으로 실행.)

### 5. 검증
```bash
ssh pi@100.76.84.97 'cd /home/pi/movie && npm run crawl:seats 2>&1 | tail -5'
```
성공 극장 수가 정상(대부분 실제 좌석수)이고 `fetch failed`가 없으면 정상화 완료.

---

## 수집 리포트 읽는 법 (2026-11-24 정리)

`crawl:showtimes` 디스코드 리포트는 0건·실패를 이유별로 나눈다. 원본 `src/lib/crawl/crawlNotice.ts`.

| 구역 | 뜻 | 할 일 |
|------|----|-------|
| 📭 열린 회차 없음 | 디트릭스 예매 목록에서 극장이 비활성(`HiddenYn=Y`). 극장 등록은 그대로고 회차만 안 열렸다. 실행은 완료(0건) | 없음. 회차가 열리면 다음 수집이 가져온다. 몇 주 이어지면 소스 점검 리포트가 알린다 |
| 🌐 출처 사이트 오류 | 출처가 5xx나 200에 실린 DB 장애 문구(`Connect Error: Too many connections`)를 줬다. `crawl_runs.error`가 `[출처 사이트 오류]`로 시작 | 없음. 다음 수집에 재시도. 며칠 이어지면 사이트에 문의 |
| 🧩 구조 변경 의심 | 자동 수집이 이번 실행에 0건. 수동 OCR(`ocr://`)은 원래 0건이라 뺀다 | 사이트를 직접 열어 본다 |
| ⚠️ 실패 | 위에 안 드는 오류(파서·네트워크) | 원인 확인 |

- dtryx 0건이 화요일에 몰리면 휴관일 문제를 의심한다 — 예전 파서는 첫날·마지막 날만 전 영화를 조회해 둘 다 휴관이면 그 주를 통째로 0건 처리했다(`crawler/dtryxScan.ts`에서 고침).
- 이 컨테이너(클라우드 세션)에서는 dtryx·`:451` 포트 문화인 사이트에 닿지 않는다. 실사이트 확인은 RPi나 브라우저에서 한다.

### 🕳 시간표가 비어 있는 극장 (소스 점검, 2026-11-26 추가)

"완료 · 0건"은 `crawl_runs.error`가 비어 있어 원인을 볼 재료가 없다. RPi에서 읽기 전용 진단을 돌려 실제 응답을 남긴다.

```bash
npx tsx scripts/diagnose-stale-sources.ts                       # 기본: 가람영화관(dtryx 000026) · 동구영상미디어센터
npx tsx scripts/diagnose-stale-sources.ts --dtryx "<listing_url>" --name <극장명> --name <디트릭스 등록명>
npx tsx scripts/diagnose-stale-sources.ts --html "<listing_url>"
```

- 요청은 하나씩, 1초 간격. DB를 읽거나 쓰지 않는다. 원본 응답은 `.audit-out/diagnose/`(git 미추적).
- dtryx 판정(`src/lib/crawl/sourceDiagnosis.ts`): `listed` 공개인데 회차 0 → 정말 회차가 없다 · `hidden` 열린 회차 없음 · `renamed` 코드가 바뀜 → `listing_url`의 `CinemaCd` 교체 · `missing` 수집처 주소(origin)와 `www.dtryx.com` 양쪽 결과를 비교해 예매처 이전 여부를 본다.
- HTML 판정: 제목·시각/날짜 개수·이미지 수·게시판 글 링크. 시각이 0이고 이미지만 있으면 이미지 시간표다 — `tableText`로는 못 읽는다(`boardImageOcr` 후보).
- 수동 업로드 끊김이 같은 극장에 두 줄 뜨면 수동 수집처가 갈라진 것이다(2026-11 인디스페이스). 업로드 입구는 `src/lib/crawl/ocrSource.ts`가 극장을 먼저 찾아 한 수집처로 모으고, 이미 갈라진 건 `supabase/seeds/19_merge_indiespace_ocr_sources.sql`처럼 `crawl_runs`·`showtime_candidates`를 옮긴 뒤 한쪽을 끈다. `showtimes`는 `theater_id` 기준이라 수집처를 정리해도 회차는 그대로다.

## 관련 파일 (RPi)

| 경로 | 용도 |
|------|------|
| `/home/pi/mac-rotate.sh` | IP 로테이션(cloned-MAC 교체 + 자가복구 워치독) |
| `/home/pi/dtryx-ban-watch.sh` | 매시간 dtryx 443 상태 감시, 상태변화 시 Discord 알림 |
| `/home/pi/.dtryx-webhook` | Discord webhook URL (perm 600) |
| `/home/pi/.dtryx-open.flag` | 직전 밴 상태 플래그 (존재=OPEN) |
| `/home/pi/mac-change.log` | IP 로테이션 로그 |
| `/home/pi/crontab.backup.20260709` | crontab 백업 |

## 재발 방지

- dtryx 대상 요청은 **도메인당 동시성 1**을 유지한다. 병렬을 올리려면 도메인 단위 큐잉/레이트리밋을 먼저 설계한다 (무지성 `Promise.all`/높은 concurrency 금지).
- 새 좌석/시간표 파서 추가 시 외부 예매 API에 대한 버스트가 없는지 확인한다.

### 예매처 이전 — dtryx 목록에서 극장이 빠짐 (2026-11-26 가람영화관)

- **증상:** dtryx 수집처가 오류 없이 매일 "완료 · 0건". `listing_url`의 `CinemaCd`가 `main_list.do` CinemaList에 공개(`N`)로도 숨김(`Y`)으로도 없다.
- **왜 오류가 안 나나:** `crawlDtryxReservationApi`는 목록에 없는 코드도 가상 극장(synthetic cinema)으로 회차를 조회한다(산천어·토마토처럼 관 필터로 쪼갠 수집처를 위한 대비). 그래서 극장이 예매처를 떠나도 빈 응답 → 0건으로 끝난다. 이 대비를 오류로 바꾸면 관 필터 수집처가 깨질 수 있어 건드리지 않았다.
- **가람영화관(삼척영화관, 000026) 근거:** 6/30 04:00 UTC 마지막 수집(누적 90회) → 6/30 16:00부터 0건. 2026-11-26 한국 IP 브라우저 확인: `samcheok.scinema.kr`·`.org` 모두 "시스템 점검중" 페이지, CinemaList에 000026·'삼척'·'가람' 없음(같은 브랜드 양구 000034는 정상). 삼척시청 블로그(2026-02-24)·스포츠경향(2026-07-09): 2026-07-01 빅브라더스 자체 발권으로 이전. 극장은 운영 중(11/26 6편).
- **조치:** `supabase/seeds/21_disable_garam_dtryx_source.sql`로 수집처를 끈다(극장 행·기록 유지). 꺼진 수집처는 소스 점검 리포트에서 빠지므로 **극장 페이지는 새 수집처가 붙을 때까지 비어 있다.**
- **후속(미완):** 빅브라더스 예매 페이지 또는 삼척시 안내(`https://www.samcheok.go.kr/00902.web`)에서 시간표를 받는 수집처. 클라우드 세션에서는 두 곳 다 닿지 않아(프록시 차단) 실제 응답 구조를 확인하지 못했다 — RPi에서 `scripts/diagnose-stale-sources.ts --html <url>`로 응답을 떠서 파서를 만든다. 그 전까지는 디스코드 `/schedule` 수동 업로드가 대안이다.
- **판별:** `scripts/diagnose-stale-sources.ts --dtryx <listing_url> --name <극장명>` → `missing`이면 이 경우다(수집처 origin과 `www.dtryx.com` 결과가 둘 다 `missing`인지 본다).
