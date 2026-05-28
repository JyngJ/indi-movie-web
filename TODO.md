# 영화볼지도 TODO (2026-05-29)

## 📊 현황 요약

| 항목 | 수량 |
|-----|------|
| 극장 | 160개 |
| 크롤 소스 총 | 169개 |
| 활성화 소스 | 128개 |
| healthy 소스 | 39개 |
| 영화 | 226편 |
| 상영후보 (candidates) | 4,844건 |
| 승인된 상영 (showtimes) | 1,050건 |

---

## ✅ 완료된 작업

### 지도 기능
- ✅ 줌 레벨 분리: 7-8 / 9 / 10+ (지역별→도시별→픽셀 기반 클러스터링)
- ✅ 세종/경기도 남부 좌표 조정
- ✅ 지역 필터 + 자동 위치 감지 (GPS 연동)
- ✅ 지하철역 검색 + 핀 표시
- ✅ 영화/감독 필터
- ✅ 거리 표시

### 크롤링 시스템
- ✅ 크롤 소스 169개 구축, 128개 활성화
- ✅ RPi 자동 크롤: 매일 01:00 / 07:00 / 13:00 KST (`pi@100.76.84.97`)
- ✅ 크롤 완료 시 Discord 알림 (시작/완료/매칭 3단계)
- ✅ 신규 영화 자동 KMDB import + 시놉시스/포스터 연결
- ✅ 자동 매칭 (showtime_candidates → showtimes)
- ✅ tinyticket 파서 (Playwright headless) 추가
- ✅ tinyticket 소스 6개 추가: 강릉신영, 대전아트, 소소아트, 시네마다방, 인천미림, 목포아트

### Discord OCR 시스템 (`/schedule` 슬래시 커맨드)
- ✅ 이미지 → GPT-4o OCR → showtime_candidates 저장
- ✅ `after()` 타이밍 픽스 (응답 후 팔로업 전송)
- ✅ format_type `standard` 픽스
- ✅ fingerprint에 screenName 포함
- ✅ JSON parse 에러 픽스: raw 제어문자 sanitize + max_tokens 4096 (PR #52, 미머지)

### 위치 권한
- ✅ 위치 권한 팝업 (첫 접속 시): prompt / denied / requesting 상태 (PR #52, 미머지)
- ✅ 서울 폴백 제거: GPS 실패 시 지역 필터 미설정 (null)
- ✅ GPS timeout 8s → 15s
- ✅ 위치 localStorage 캐시 (30분)
- ✅ FilterBar: userPickedRegionRef — 사용자 수동 선택 시 GPS override 차단

### DB 관리
- ✅ pg_cron: 3일 지난 showtimes 매일 새벽 3시 자동 삭제
- ✅ 전주디지털독립영화관 DB 중복 정리 (구 레코드 삭제, 28개 candidates 이전)
- ✅ RPi crontab 수정: pull 전 `git checkout -- package*.json` 자동 실행

---

## 🔴 현재 이슈

### 크롤 불가 소스 (enabled지만 0개 수집)
- **인디스페이스**: 상영표가 이미지 → OCR 파이프라인 필요
- **조이앤시네마 전주**: 사이트 접근 불가
- **픽쳐하우스**: 502 에러
- **판타스틱 큐브**: dtryx 영화관 코드 없음
- **천안인생극장**: 파서 없음
- **동리시네마**: OCR 전용 (ocr://admin)
- **tinyticket 4개** (대전아트, 소소아트, 시네마다방, 목포아트): 현재 상영 이벤트 없거나 playwright 미작동 확인 필요

### healthy 소스 39개 / enabled 128개 불일치
- unhealthy 표시되지만 실제 수집은 되는 소스 다수
- health 상태 업데이트 로직 개선 필요

---

## 📋 할 일

### 크롤링
- [ ] tinyticket playwright 소스 RPi에서 정상 동작 확인
  - node_modules에 playwright-chromium 존재 확인
  - 대전아트, 소소아트 등 0개 수집 원인 파악
- [ ] 인디스페이스 처리 방안 결정
  - ① Discord OCR 파이프라인 활용 (수동)
  - ② `작품별 상영일정` 게시글 본문 파싱 (자동)
- [ ] 필름포럼 → Moviee 어댑터 전환 (`https://moviee.co.kr/Theater/Index?thsynid=130`)
- [ ] KU시네마테크 → Moviee 어댑터 전환 (`https://moviee.co.kr/Movie/Ticket?tid=121`)
- [ ] health 상태 업데이트 로직: 수집 성공 시 `healthy`로 자동 복구

### 자동 매칭
- [ ] GV / 시네토크 등 부가 행사 제목 분리
  - `영화 제목 + GV` → `movie_title`에 본편만, 부가행사는 memo 필드
- [ ] 자동 매칭 실패율 모니터링 (현재 검토 필요 285건)

### 어드민
- [ ] 어드민 UI 개선 (불편한 부분 파악)
- [ ] 상영후보 검토 UX — 벌크 승인/거부 기능

### 데이터
- [ ] 포스터 없는 영화 채우기
  ```bash
  npx tsx --env-file=.env.local scripts/fill-poster-kmdb.ts --apply
  npx tsx --env-file=.env.local scripts/fill-poster-wiki.ts --apply
  ```
- [ ] 극장 좌표 검증 (일부 임의값)
- [ ] 극장 인스타그램 미확인 17개 보정

### 릴리즈 전
- [ ] 계정 만들기 + 위시리스트 기능
- [ ] 지도 타일: CARTO → Stadia Maps 전환 (상업 이용 시)
- [ ] Mock 카탈로그 제거 (`src/lib/catalog/client.ts`)

### 바텀시트
- [ ] "이 날 상영하는 영화만 보기" UX 재설계 (현재 주석처리)
- [ ] 스크롤 가능 영역 시각적 힌트 (하단 fade-out)
- [ ] 상영 편수 표기 — "이 날 N편" 형태로 변경

### 검색
- [ ] 영화별 상영 극장 섹션 (3개 + 더보기)
- [ ] 역 선택 → 주변 극장 연결
- [ ] 필터바 영화/감독 칩 클릭 시 검색창 카테고리 pre-select

---

## 🔗 유용한 커맨드

```bash
# 크롤 수동 실행
npm run crawl:showtimes

# RPi SSH
ssh pi@100.76.84.97

# RPi 크롤 로그 확인
ssh pi@100.76.84.97 "tail -50 /home/pi/movie/crawl.log"

# DB 통계
npx tsx --env-file=.env.local scripts/check-todo-stats.ts
```
