'use client'

import { BottomSheet } from '@/components/primitives/BottomSheet'
import { PosterThumb } from './PosterThumb'

/* 아이콘 정책: 12 / 16 / 18 / 24 → 버튼은 24px */
const IconStar = ({ filled = false }: { filled?: boolean }) => (
  <svg width={24} height={24} viewBox="0 0 24 24"
    fill={filled ? 'var(--color-primary-base)' : 'none'}
    stroke={filled ? 'var(--color-primary-base)' : 'currentColor'}
    strokeWidth="1.6" strokeLinejoin="round"
  >
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" />
  </svg>
)

const IconClose = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

interface MoviePreview {
  id: string
  title: string
  director?: string   /* 감독 이름 (한글) */
  src?: string
}

interface TheaterSheetProps {
  name: string
  address?: string
  movies?: MoviePreview[]
  favorited?: boolean
  selectedMovieId?: string
  onFavorite?: () => void
  onClose?: () => void
  onMovieSelect?: (id: string) => void
}

export function TheaterSheet({
  name, address, movies = [], favorited = false,
  selectedMovieId, onFavorite, onClose, onMovieSelect,
}: TheaterSheetProps) {
  const iconBg = 'var(--color-surface-raised)'

  return (
    <BottomSheet>
      {/* 헤더: 극장명 + 아이콘 */}
      <div className="flex items-start justify-between gap-3 px-5">
        <div className="flex-1 min-w-0">
          <h2
            className="font-bold leading-[1.25]"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', fontSize: 'var(--text-h3)' }}
          >
            {name}
          </h2>
          {address && (
            <p className="mt-1" style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)' }}>
              {address}
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: iconBg, color: 'var(--color-text-body)' }}
            onClick={onFavorite}
          >
            <IconStar filled={favorited} />
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: iconBg, color: 'var(--color-text-body)' }}
            onClick={onClose}
          >
            <IconClose />
          </button>
        </div>
      </div>

      {/* 포스터 가로 스크롤 */}
      {movies.length > 0 && (
        <div
          className="mt-[14px]"
          style={{
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-bg)',
          }}
        >
          <div className="flex gap-4 px-5 py-[14px] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {movies.map((movie) => (
              <div key={movie.id} className="flex flex-col gap-[6px] flex-shrink-0" style={{ width: 96 }}>
                <PosterThumb
                  src={movie.src}
                  alt={movie.title}
                  width={96}
                  height={144}
                  size="lg"
                  selected={selectedMovieId === movie.id}
                  onClick={() => onMovieSelect?.(movie.id)}
                />
                <p
                  className="font-bold leading-[1.3] truncate"
                  style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', fontSize: 'var(--text-ridi-sm)' }}
                >
                  {movie.title}
                </p>
                {movie.director && (
                  <p className="truncate" style={{ fontSize: 10, color: 'var(--color-text-caption)' }}>
                    {movie.director}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
