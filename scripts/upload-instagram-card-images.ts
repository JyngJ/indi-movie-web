/**
 * 인스타그램 추천 카드 이미지 4장을 Supabase Storage에 업로드하고 public URL을 출력한다.
 * 사용법: npx tsx scripts/upload-instagram-card-images.ts
 *
 * 버킷: instagram-cards (없으면 생성, public read)
 */
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key.trim()]) process.env[key.trim()] = value.trim()
    }
  })
}

const BUCKET = 'instagram-cards'
const SOURCE_DIR = path.join(process.env.HOME ?? '', 'Downloads', '여기 썸네일')

const FILES: Array<{ file: string; slug: string }> = [
  { file: '해피엔드.jpg', slug: 'happy-end' },
  { file: '백룸.jpg', slug: 'the-back-room' },
  { file: '바쿠라우 외.jpg', slug: 'bacurau-and-more' },
  { file: '마티슈프림 외.jpg', slug: 'marty-supreme-and-more' },
]

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음(.env.local 확인)')

  const sb = createClient(url, key)

  const { data: buckets } = await sb.storage.listBuckets()
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true })
    if (error) throw error
    console.log(`✅ 버킷 생성: ${BUCKET}`)
  }

  const results: Record<string, string> = {}

  for (const { file, slug } of FILES) {
    const filePath = path.join(SOURCE_DIR, file)
    if (!fs.existsSync(filePath)) {
      console.log(`❌ 파일 없음: ${filePath}`)
      continue
    }
    const buffer = fs.readFileSync(filePath)
    const objectPath = `${slug}.jpg`

    const { error } = await sb.storage.from(BUCKET).upload(objectPath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })
    if (error) {
      console.log(`❌ 업로드 실패(${file}): ${error.message}`)
      continue
    }

    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(objectPath)
    results[file] = pub.publicUrl
    console.log(`✅ ${file} → ${pub.publicUrl}`)
  }

  console.log('\n결과 요약:')
  console.log(JSON.stringify(results, null, 2))
}

run().catch((error) => {
  console.error('❌ 스크립트 실행 중 오류:', error)
  process.exit(1)
})
