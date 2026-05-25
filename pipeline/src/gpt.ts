import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import type { ExtractResult } from './types.ts'

const client = new Anthropic()  // ANTHROPIC_API_KEY 환경변수

const SYSTEM_PROMPT = `
당신은 독립/예술 영화관 상영 시간표 이미지를 분석하는 전문가입니다.
이미지와 함께 OCR이 추출한 텍스트가 제공될 수 있습니다.
OCR 텍스트를 참고하되, 오인식된 부분은 이미지를 기준으로 교정하세요.
반드시 JSON 형식으로만 응답하세요. 다른 텍스트나 마크다운은 포함하지 마세요.
`.trim()

const USER_PROMPT = (ocrText: string, theaterHint: string, dateHint: string) => `
다음 상영 시간표 이미지를 분석해주세요.

${ocrText ? `[OCR 추출 텍스트]\n${ocrText}\n` : ''}
[힌트]
- 극장명 힌트: ${theaterHint || '없음 (이미지에서 추출)'}
- 기준 날짜: ${dateHint || '이미지에서 추론'}

[출력 형식]
{
  "theater_name": "극장명",
  "week_range": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "screenings": [
    { "date": "YYYY-MM-DD", "time": "HH:MM", "movie_title": "영화 제목", "screen_name": "1관" }
  ],
  "corrections": ["교정 내용 설명"],
  "confidence": 0.95
}

주의:
- movie_title은 줄바꿈으로 나뉜 경우 이어붙여서 완전한 제목으로
- 날짜 헤더(5/7 목 등)를 기준으로 각 열의 날짜를 정확히 매핑
- 연도가 없으면 ${new Date().getFullYear()}년으로 처리
- 대관/휴관 등 영화가 아닌 슬롯은 제외
`.trim()

export async function extractWithGPT(
  imagePath: string,
  ocrText = '',
  theaterHint = '',
  dateHint = '',
): Promise<ExtractResult> {
  const imageBuffer = fs.readFileSync(imagePath)
  const base64 = imageBuffer.toString('base64')
  const ext = path.extname(imagePath).toLowerCase()
  const mediaType: 'image/png' | 'image/webp' | 'image/jpeg' =
    ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : 'image/jpeg'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: USER_PROMPT(ocrText, theaterHint, dateHint),
        },
      ],
    }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('응답에서 JSON을 찾을 수 없습니다')
  return JSON.parse(match[0]) as ExtractResult
}
