import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

async function main() {
  const imagePath = process.argv[2]
  if (!imagePath) { console.error('사용법: npx tsx scripts/test-ocr.ts <이미지경로> [극장힌트]'); process.exit(1) }
  const theaterHint = process.argv[3] ?? '인디스페이스'

  console.log('이미지:', imagePath)
  console.log('극장 힌트:', theaterHint)

  const openai = new OpenAI()
  const buffer = fs.readFileSync(imagePath)
  const base64 = buffer.toString('base64')
  const ext = path.extname(imagePath).toLowerCase()
  const mediaType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  const year = new Date().getFullYear()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
        {
          type: 'text',
          text: `이 이미지는 한국 독립/예술 영화관의 상영시간표입니다.
${theaterHint ? `극장명 힌트: ${theaterHint}` : ''}
모든 상영 정보를 빠짐없이 추출해서 JSON으로만 반환하세요.
- 날짜: YYYY-MM-DD (연도 없으면 ${year} 사용)
- 시간: HH:MM (24시간제)

{"theaterName":"극장명","showtimes":[{"movieTitle":"영화 제목","showDate":"2026-05-28","showTime":"14:00","screenName":"1관"}],"corrections":[],"confidence":0.95}`,
        },
      ],
    }],
  })

  const text = response.choices[0].message.content ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) { console.error('JSON 없음:', text); process.exit(1) }

  const result = JSON.parse(match[0])
  console.log('\n결과:')
  console.log(JSON.stringify(result, null, 2))
  console.log(`\n총 ${result.showtimes?.length ?? 0}개 상영 추출`)
}

main().catch(console.error)
