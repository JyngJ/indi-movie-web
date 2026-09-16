import type { HTMLAttributes } from 'react'

/** 높이가 제한된 패널의 스크롤 본문. 자식은 줄이지 않고 원래 높이대로 쌓는다. */
export function PanelScrollBody({ children, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} style={{ ...style, display: 'block', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {children}
    </div>
  )
}
