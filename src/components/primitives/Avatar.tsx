'use client'

import { useEffect, useState } from 'react'
import { toSecureImageUrl } from '@/lib/media/imageUrl'

/** 사람 원형 아바타 — 피그마 2.0/Avatar (Size=160/100/48/28).
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
  const normalizedPhotoUrl = photoUrl?.trim() || null
  const imageSrc = normalizedPhotoUrl ? toSecureImageUrl(normalizedPhotoUrl) : undefined
  const accessibleName = name.trim() || '사용자'
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null)

  useEffect(() => {
    setFailedImageSrc(null)
  }, [imageSrc])

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
      {imageSrc && failedImageSrc !== imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt={`${accessibleName} 프로필 사진`} onError={() => setFailedImageSrc(imageSrc)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.36), fontWeight: 700, color: 'var(--color-text-caption)' }}>
          {accessibleName.charAt(0)}
        </span>
      )}
    </div>
  )
}
