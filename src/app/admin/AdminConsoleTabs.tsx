'use client'

import { useState } from 'react'
import { AdminShowtimeConsole } from './AdminShowtimeConsole'
import { AdminEventConsole } from './AdminEventConsole'
import styles from './admin.module.css'

export function AdminConsoleTabs() {
  const [tab, setTab] = useState<'showtimes' | 'events'>('showtimes')

  return (
    <>
      <nav
        className={styles.tabNav}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 4000,
          padding: '12px 24px 0',
          background: 'var(--color-surface-bg)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
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
      </nav>
      <div style={{ paddingTop: 52 }}>
        {tab === 'showtimes' && <AdminShowtimeConsole />}
        {tab === 'events' && <AdminEventConsole />}
      </div>
    </>
  )
}
