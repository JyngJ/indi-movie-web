'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { AdminShowtimeConsole } from './AdminShowtimeConsole'
import { AdminEventConsole } from './AdminEventConsole'
import styles from './admin.module.css'

export function AdminConsoleTabs() {
  const [tab, setTab] = useState<'showtimes' | 'events'>('showtimes')

  const tabSlot: ReactNode = (
    <div style={{ display: 'flex', gap: 4 }}>
      <button
        className={`${styles.tabBtn} ${tab === 'showtimes' ? styles.tabBtnActive : ''}`}
        onClick={() => setTab('showtimes')}
      >
        상영시간표
      </button>
      <button
        className={`${styles.tabBtn} ${tab === 'events' ? styles.tabBtnActive : ''}`}
        onClick={() => setTab('events')}
      >
        이벤트 / GV
      </button>
    </div>
  )

  if (tab === 'showtimes') return <AdminShowtimeConsole tabSlot={tabSlot} />
  return <AdminEventConsole tabSlot={tabSlot} />
}
