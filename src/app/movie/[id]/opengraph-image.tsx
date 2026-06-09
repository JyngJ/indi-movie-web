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
    .from('movies')
    .select('title, original_title, director, genre, year, poster_url')
    .eq('id', id)
    .single()

  const fontBold = await readFile(path.join(process.cwd(), 'public/fonts/KIMM_bold.ttf'))

  const title = data?.title ?? '영화볼지도'
  const originalTitle = data?.original_title ?? ''
  const directors = (data?.director as string[] | null) ?? []
  const genres = (data?.genre as string[] | null) ?? []
  const year = data?.year ?? ''
  const posterUrl = data?.poster_url ?? null

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#0E0D0B',
          padding: '60px 80px',
        }}
      >
        {/* 왼쪽: 포스터 */}
        {posterUrl && (
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              width: 280,
              height: 420,
              marginRight: 60,
              alignSelf: 'center',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt=""
              width={280}
              height={420}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          </div>
        )}

        {/* 오른쪽: 텍스트 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            minWidth: 0,
            paddingTop: 20,
            paddingBottom: 20,
          }}
        >
          {/* 상단: 앱 이름 */}
          <div style={{ display: 'flex', fontSize: 20, color: '#4A6380', fontFamily: 'KIMM', fontWeight: 700 }}>
            영화볼지도
          </div>

          {/* 중앙: 영화 정보 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {genres.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {genres.slice(0, 3).map((g) => (
                  <div
                    key={g}
                    style={{
                      display: 'flex',
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#4A6380',
                      background: '#1A2530',
                      borderRadius: 6,
                      padding: '3px 12px',
                    }}
                  >
                    {g}
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                fontFamily: 'KIMM',
                fontSize: title.length > 10 ? 56 : 72,
                fontWeight: 700,
                color: '#F8F6F2',
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>
            {originalTitle && (
              <div style={{ fontSize: 20, color: '#635D55', fontStyle: 'italic' }}>
                {originalTitle}
              </div>
            )}
            {(directors.length > 0 || year) && (
              <div style={{ display: 'flex', fontSize: 22, color: '#8A847C', gap: 12 }}>
                {directors.length > 0 && <span>{directors.join(', ')} 감독</span>}
                {directors.length > 0 && year && <span>·</span>}
                {year && <span>{year}</span>}
              </div>
            )}
          </div>

          {/* 하단: 도메인 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              borderTop: '1px solid #2C2820',
              paddingTop: 20,
              fontSize: 16,
              color: '#4A4540',
            }}
          >
            yeonghwabolzido.com
          </div>
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
