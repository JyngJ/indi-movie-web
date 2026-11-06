import type { ReactNode } from 'react'

/** 지도 탭 — theater 슬롯은 지도 위에서 극장 주소(/films/theater/[id])를 가로챈다.
 *  지도에서 시트를 펼치면 주소는 극장 페이지가 되고, 같은 주소를 새로 열면 극장 페이지가 그대로 뜬다. */
export default function MapLayout({ children, theater }: { children: ReactNode; theater: ReactNode }) {
  return (
    <>
      {children}
      {theater}
    </>
  )
}
