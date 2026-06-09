import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('theaters')
    .select('name, city, address')
    .eq('id', id)
    .single()

  const fontBold = await readFile(path.join(process.cwd(), 'public/fonts/KIMM_bold.ttf'))

  const name = data?.name ?? '영화볼지도'
  const city = data?.city ?? ''
  const address = data?.address ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0E0D0B',
          padding: '60px 80px',
          justifyContent: 'space-between',
        }}
      >
        {/* 상단: 앱 이름 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: '#4A6380',
              letterSpacing: '0.05em',
              fontFamily: 'KIMM',
              fontWeight: 700,
            }}
          >
            영화볼지도
          </div>
          <div style={{ color: '#2C2820', fontSize: 22 }}>·</div>
          <div style={{ fontSize: 20, color: '#635D55' }}>독립·예술영화관 상영 정보</div>
        </div>

        {/* 중앙: 극장 정보 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {city ? (
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 600,
                color: '#4A6380',
                background: '#1A2530',
                borderRadius: 6,
                padding: '4px 14px',
                width: 'fit-content',
              }}
            >
              {city}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: 'KIMM',
              fontSize: name.length > 8 ? 64 : 80,
              fontWeight: 700,
              color: '#F8F6F2',
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
          {address ? (
            <div style={{ fontSize: 22, color: '#635D55', marginTop: 4 }}>{address}</div>
          ) : null}
        </div>

        {/* 하단: 구분선 + 도메인 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            borderTop: '1px solid #2C2820',
            paddingTop: 20,
          }}
        >
          <div style={{ fontSize: 16, color: '#4A4540' }}>영화볼지도.com</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'KIMM',
          data: fontBold,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  )
}
