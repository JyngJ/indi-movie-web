# 상영 시간표 파이프라인

이미지 → GPT-4o Vision → JSON 추출, Discord 연동

## 환경 설정

```bash
cp .env.example .env
# .env 파일에 아래 값 입력
```

| 변수 | 설명 |
|------|------|
| `OPENAI_API_KEY` | GPT-4o API 키 |
| `DISCORD_BOT_TOKEN` | Discord 봇 토큰 |
| `DISCORD_CHANNEL_ID` | 기본 채널 ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Google Vision 서비스 계정 JSON 경로 (OCR 사용 시) |

```bash
npm install
```

---

## 명령어

### 시간표 이미지 추출

```bash
# 기본 (GPT Vision만)
npm run extract -- --input 시간표.jpg

# 극장명 힌트 포함
npm run extract -- --input 시간표.jpg --theater "더숲 아트시네마"

# 기준 날짜 지정 (이미지에 연도 없을 때)
npm run extract -- --input 시간표.jpg --date 2026-05-07

# Google Vision OCR 없이 실행
npm run extract -- --input 시간표.jpg --no-ocr

# JSON 파일로 저장
npm run extract -- --input 시간표.jpg > output.json
```

### Discord 연결 테스트

```bash
# 채널 메시지 읽기 + 테스트 메시지 전송
npm run discord:test
```

---

## 파일 구조

```
src/
├── types.ts          공통 타입 (ExtractResult, Screening 등)
├── gpt.ts            GPT-4o Vision 추출
├── ocr.ts            Google Vision OCR (선택)
├── extract.ts        CLI 진입점 (이미지 → JSON 출력)
├── discord.ts        Discord 유틸 (메시지 송수신)
└── test-discord.ts   Discord 연결 테스트
```

---

## 다음 단계 (TODO)

- [ ] Discord 이미지 수신 → extract 자동 호출
- [ ] KMDB 퍼지 매칭으로 영화 제목 보정
- [ ] Supabase `showtime_candidates` 테이블 삽입
