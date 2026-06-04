import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

interface OcrShowtime {
  movieTitle: string
  showDate: string
  showTime: string
  screenName: string
  endTime?: string
}

interface OcrResult {
  theaterName: string
  showtimes: OcrShowtime[]
  corrections: string[]
  confidence: number
}

export async function POST(request: Request) {
  try { await requireAdminSessionUser(request) } catch (error) { return adminAuthErrorResponse(error) }

  const formData = await request.formData()
  const file = formData.get('image') as File | null
  const theaterHint = (formData.get('theaterHint') as string) ?? ''
  const action = (formData.get('action') as string) ?? 'parse'

  if (!file) return Response.json({ error: { message: '이미지가 없습니다.' } }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mime = file.type || 'image/jpeg'
  const mediaType = (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime) ? mime : 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'image/webp'

  const openai = new OpenAI()
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
- 대관/휴관/이벤트는 제외

{"theaterName":"극장명","showtimes":[{"movieTitle":"영화 제목","showDate":"2026-05-28","showTime":"14:00","screenName":"1관","endTime":"16:10"}],"corrections":["교정 메모"],"confidence":0.95}`,
        },
      ],
    }],
  })

  const text = response.choices[0].message.content?.trim() ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return Response.json({ error: { message: 'OCR 결과 파싱 실패' } }, { status: 500 })

  const parsed = JSON.parse(match[0]) as OcrResult

  if (action === 'save') {
    const supabase = createSupabaseAdminClient()
    const sourceId = `ocr-${parsed.theaterName.replace(/[^a-z0-9가-힣]/gi, '-').toLowerCase()}`

    let { data: source } = await supabase
      .from('crawl_sources')
      .select('id, matched_theater_id')
      .eq('id', sourceId)
      .maybeSingle()

    if (!source) {
      const { data: theater } = await supabase
        .from('theaters')
        .select('id')
        .ilike('name', `%${parsed.theaterName}%`)
        .maybeSingle()

      const { data: created } = await supabase
        .from('crawl_sources')
        .insert({
          id: sourceId,
          theater_id: sourceId,
          theater_name: parsed.theaterName,
          matched_theater_id: theater?.id ?? null,
          homepage_url: null,
          listing_url: 'ocr://admin',
          parser: 'ocr',
          enabled: true,
          cadence: 'manual',
          health: 'healthy',
          notes: '어드민 OCR 업로드',
        })
        .select('id, matched_theater_id')
        .single()
      source = created
    }

    if (!source) return Response.json({ error: { message: '소스 생성 실패' } }, { status: 500 })

    const runId = randomUUID()
    await supabase.from('crawl_runs').insert({
      id: runId,
      source_id: source.id,
      source_name: parsed.theaterName,
      status: 'completed',
      input_kind: 'url',
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      created_count: parsed.showtimes.length,
      updated_count: 0,
      warning_count: parsed.corrections.length,
      error: null,
    })

    const SKIP_TITLES = /^(대관|휴관|행사|이벤트|대관행사|closed|event)/i
    const rows = parsed.showtimes
      .filter((st) => !SKIP_TITLES.test(st.movieTitle.trim()))
      .map((st) => ({
      id: randomUUID(),
      source_id: source!.id,
      theater_id: source!.id,
      theater_name: parsed.theaterName,
      matched_theater_id: source!.matched_theater_id ?? null,
      movie_title: st.movieTitle,
      screen_name: st.screenName || '1관',
      show_date: st.showDate,
      show_time: st.showTime,
      end_time: st.endTime ?? null,
      format_type: 'standard',
      language: 'korean',
      seat_available: 0,
      seat_total: 0,
      price: 0,
      booking_url: null,
      source_url: null,
      raw_text: JSON.stringify(st),
      confidence: parsed.confidence,
      warnings: parsed.corrections,
      status: 'draft',
      fingerprint: Buffer.from(`${source!.id}|${st.movieTitle}|${st.showDate}|${st.showTime}|${st.screenName || '1관'}`).toString('base64').slice(0, 64),
    }))

    const uniqueRows = [...new Map(rows.map((r) => [r.fingerprint, r])).values()]
    const { error } = await supabase.from('showtime_candidates').upsert(uniqueRows, { onConflict: 'fingerprint' })
    if (error) return Response.json({ error: { message: error.message } }, { status: 500 })

    return Response.json({ saved: uniqueRows.length, result: parsed })
  }

  return Response.json({ result: parsed })
}
