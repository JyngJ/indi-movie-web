'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 시놉시스 접기/펼치기 — 5줄 넘으면 잘라내고 연한 [더보기]를 붙인다 (인스타그램 문법).
 * 더보기로 펼치고, 펼쳐진 본문을 탭하면 다시 접힌다.
 * 영화 상세 두 라우트(/movie · /films/movie)가 공유한다 — 문구·줄수 규칙은 여기 한 곳에만.
 */
const CLAMP_LINES = 5

export function ExpandableSynopsis({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  // 5줄을 실제로 넘는지 측정 — 넘지 않으면 더보기를 아예 그리지 않는다
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text])

  return (
    <div>
      <p
        ref={ref}
        onClick={expanded ? () => setExpanded(false) : undefined}
        style={{
          margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-body)', wordBreak: 'keep-all',
          ...(expanded
            ? { cursor: 'pointer' }
            : {
                display: '-webkit-box',
                WebkitLineClamp: CLAMP_LINES,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }),
        }}
      >
        {text}
      </p>
      {!expanded && clamped && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: 'none', border: 'none', paddingTop: 8, paddingBottom: 8, paddingLeft: 0, paddingRight: 0, minHeight: 'auto', cursor: 'pointer',
            fontSize: 14, lineHeight: 1.4, color: 'var(--color-text-caption)',
          }}
        >
          더보기
        </button>
      )}
    </div>
  )
}
