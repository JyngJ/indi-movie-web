import type { ReactNode } from 'react'
import { DetailShell } from '@/components/navigation/DetailShell'
import { AdSenseScript } from '@/components/analytics/AdSenseScript'

export default function DetailLayout({ children }: { children: ReactNode }) {
  return (
    <DetailShell>
      <AdSenseScript />
      {children}
    </DetailShell>
  )
}
