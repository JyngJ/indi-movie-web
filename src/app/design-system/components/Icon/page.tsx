import { redirect } from 'next/navigation'

/** Icon은 파운데이션(Iconography)으로 옮겼다. 예전 주소로 들어와도 그리로 보낸다. */
export default function IconComponentPage() {
  redirect('/design-system/foundations/iconography')
}
