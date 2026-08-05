import type { ReactNode } from 'react'
import { DetailShell } from '@/components/navigation/DetailShell'

export default function DetailLayout({ children }: { children: ReactNode }) {
  return <DetailShell>{children}</DetailShell>
}
