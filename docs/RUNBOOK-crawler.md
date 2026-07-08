# 크롤러 운영 런북 (Crawler Runbook)

좌석/상영시간표 크롤러의 운영, 장애 대응, IP 밴 복구 절차를 정리한다.

---

## 실행 환경

- **크롤러 서버:** Raspberry Pi (RPi). 접속 `ssh pi@100.76.84.97` (Tailscale 오버레이 IP — 공인 IP가 바뀌어도 유지됨).
- **레포 경로:** `/home/pi/movie` (추적 브랜치 `main`). 코드는 `main`에 머지돼야 다음 크론에서 반영된다.
- **환경변수:** RPi `/home/pi/movie/.env.local` (Supabase URL/service key 등). 모든 크롤 스크립트는 `tsx --env-file=.env.local ...` 로 실행.
- **네트워크:** RPi는 공인 IP를 `eth0`에 **직접** 받는다 (NAT 뒤 아님, KT 동적 DHCP). NetworkManager 관리, 연결명 `"Wired connection 1"`.

### crontab (2026-07-09 기준)

| 스케줄 | 작업 | 로그 |
|--------|------|------|
| `0 */3 * * *` | `npm run crawl:seats` | `seat.log` |
| `0 1,7,13 * * *` | `git pull` + `npm run crawl:showtimes` | `crawl.log` |
| `30 1,7,13 * * *` | `npm run crawl:curation` | `curation.log` |
| `0 6 * * 1` | `npm run curate:weekly-ranking` | `ranking.log` |
| `0 */4 * * *` | `npm run check:crawl-health` | `health.log` |
| `0 * * * *` | `dtryx-ban-watch.sh` (밴 감시, 알림전용) | `dtryx-ban-watch.log` |

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

### 2. IP 로테이션 (RPi 공인 IP 교체)
```bash
ssh pi@100.76.84.97 'sudo systemd-run --unit=mac-rotate --collect /bin/bash /home/pi/mac-rotate.sh'
# ~20초 후 결과 확인
ssh pi@100.76.84.97 'tail -5 /home/pi/mac-change.log; curl -s https://api.ipify.org'
```
- `mac-rotate.sh` = `eth0` cloned-MAC을 랜덤(OUI `e4:5f:01` 유지)으로 바꿔 DHCP 새 lease → 새 공인 IP 획득.
- **자가복구 워치독 내장:** 150초 뒤 인터넷이 죽어 있으면 원래 하드웨어 MAC으로 자동 롤백.
- `systemd-run`으로 detached 실행 → SSH 세션이 끊겨도 계속 진행. SSH는 Tailscale 오버레이(`100.76.84.97`)라 공인 IP가 바뀌어도 유지됨.
- 로그에 `dtryx:443 OPEN - 밴 회피 성공!` 뜨면 완료.

### 3. MAC 원복 (필요 시)
```bash
ssh pi@100.76.84.97 'nmcli con mod "Wired connection 1" 802-3-ethernet.cloned-mac-address "" && nmcli con up "Wired connection 1"'
```
빈 값 = 영구 하드웨어 MAC으로 복귀. (cloned MAC은 재부팅해도 NM이 유지하므로, 원복하려면 명시적으로 실행.)

### 4. 검증
```bash
ssh pi@100.76.84.97 'cd /home/pi/movie && npm run crawl:seats 2>&1 | tail -5'
```
성공 극장 수가 정상(대부분 실제 좌석수)이고 `fetch failed`가 없으면 정상화 완료.

---

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
