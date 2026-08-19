'use client'

import { toSecureImageUrl } from '@/lib/media/imageUrl'

/** 감독 원형 아바타 — 피그마 2.0/Avatar (Size=160/100/48/28).
 *  사진 없으면 이니셜 폴백(bg neutral-100 · 글자 neutral-500 · size×0.36).
 *  링은 --shadow-inset (피그마 2.0/shadow/inset 대응). */
export function Avatar({
  name,
  photoUrl,
  size,
}: {
  name: string
  photoUrl?: string | null
  size: number
}) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        overflow: 'hidden', flexShrink: 0,
        backgroundColor: 'var(--color-surface-raised)',
        boxShadow: 'var(--shadow-inset)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={toSecureImageUrl(photoUrl)} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.36), fontWeight: 700, color: 'var(--color-text-caption)' }}>
          {name.charAt(0)}
        </span>
      )}
    </div>
  )
}
