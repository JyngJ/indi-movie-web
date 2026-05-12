/**
 * 사용법:
 *   node --experimental-strip-types src/extract.ts --input <이미지 경로> [--theater <극장명>] [--date <YYYY-MM-DD>] [--no-ocr]
 *
 * 환경변수:
 *   ANTHROPIC_API_KEY              Claude API 키
 *   GOOGLE_APPLICATION_CREDENTIALS Google Vision 서비스 계정 JSON 경로
 */

import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { extractTextWithOCR } from './ocr.ts'
import { extractWithGPT } from './gpt.ts'
import type { PipelineInput } from './types.ts'

/* ── CLI 인자 파싱 ── */
function parseArgs(): PipelineInput & { noOcr: boolean } {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : undefined
  }
  const imagePath = get('--input')
  if (!imagePath) {
    console.error('사용법: node --experimental-strip-types src/extract.ts --input <이미지경로>')
    process.exit(1)
  }
  return {
    imagePath,
    theaterHint: get('--theater'),
    dateHint: get('--date'),
    noOcr: args.includes('--no-ocr'),
  }
}

/* ── 메인 ── */
async function main() {
  const { imagePath, theaterHint, dateHint, noOcr } = parseArgs()
  const absPath = path.resolve(imagePath)

  if (!fs.existsSync(absPath)) {
    console.error(`파일을 찾을 수 없음: ${absPath}`)
    process.exit(1)
  }

  console.error(`[1/3] 이미지 로드: ${absPath}`)

  /* Step 1: OCR */
  let ocrText = ''
  if (!noOcr) {
    console.error('[2/3] Google Vision OCR 실행 중...')
    try {
      ocrText = await extractTextWithOCR(absPath)
      console.error(`      OCR 완료 — ${ocrText.length}자 추출`)
    } catch (e) {
      console.error(`      OCR 실패 (건너뜀): ${(e as Error).message}`)
      console.error('      --no-ocr 플래그로 OCR 없이 실행 가능')
    }
  } else {
    console.error('[2/3] OCR 스킵 (--no-ocr)')
  }

  /* Step 2: Claude Vision */
  console.error('[3/3] Claude Vision 분석 중...')
  const result = await extractWithGPT(absPath, ocrText, theaterHint, dateHint)

  /* Step 3: 결과 출력 */
  console.error(`      완료 — ${result.screenings.length}개 상영 추출, confidence: ${result.confidence}`)
  if (result.corrections.length > 0) {
    console.error(`      교정 항목 (${result.corrections.length}개):`)
    result.corrections.forEach(c => console.error(`        - ${c}`))
  }

  // 결과는 stdout으로 (파이프 연결 가능하도록)
  console.log(JSON.stringify(result, null, 2))
}

main().catch(e => {
  console.error('오류:', e)
  process.exit(1)
})
