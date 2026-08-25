import { NextResponse } from 'next/server'
import { createSupabaseAuthServerClient } from '@/lib/supabase/auth-server'
import { getValidKakaoAccessToken } from '@/lib/auth/kakaoTokenStore'
import { sendKakaoMemoText } from '@/lib/auth/kakao'

export const dynamic = 'force-dynamic'

/**
 * 개발용 — 로그인한 본인 카톡('나와의 채팅')으로 테스트 메시지 발송.
 * 프로덕션에선 404. P3에서 정식 알림 파이프라인으로 대체.
 *   GET /api/dev/kakao-memo?text=안녕
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') return new NextResponse(null, { status: 404 })

  const supabase = await createSupabaseAuthServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return NextResponse.json({ ok: false, error: 'not signed in' }, { status: 401 })

  const tok = await getValidKakaoAccessToken(data.user.id)
  if (!tok) return NextResponse.json({ ok: false, error: 'no kakao token row — 다시 로그인 필요' }, { status: 400 })
  if (!tok.scopes.includes('talk_message')) {
    return NextResponse.json({ ok: false, error: 'talk_message 미동의', scopes: tok.scopes }, { status: 400 })
  }

  const text = new URL(request.url).searchParams.get('text') ?? '영화볼지도 테스트 메시지 — 카톡 알림 파이프라인 확인'
  try {
    await sendKakaoMemoText({
      accessToken: tok.accessToken,
      text,
      linkUrl: 'https://www.xn--hq1bv8o5phw2d7wt.com/',
      buttonTitle: '영화볼지도 열기',
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
