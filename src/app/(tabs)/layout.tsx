import type { ReactNode } from 'react'
import { GlobalNav } from '@/components/navigation/GlobalNav'

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GlobalNav />
      {children}
    </>
  )
}
