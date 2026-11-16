'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { Button, Icon } from '@/components/primitives'
import { SettingsReportPage } from '@/components/map/SettingsPanel'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { bookingGuide } from '@/lib/booking/confirmation'

import styles from './BookingConfirmation.module.css'

export interface BookingShowtime {
  id: string
  movieId?: string
  movieTitle: string
  theaterName: string
  dateLabel: string
}

export function BookingConfirmation({ showtime, bookingUrl, onClose, children }: {
  showtime: BookingShowtime
  bookingUrl: string
  onClose: () => void
  children: ReactNode
}) {
  const desktop = useIsDesktopLayout()
  const guide = bookingGuide(bookingUrl, desktop)
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [view, setView] = useState<'confirm' | 'report' | 'sent'>('confirm')
  useLockBodyScroll(true)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>('[data-booking-focus]')?.focus()
  }, [view])

  const reportDetail = [
    `영화: ${showtime.movieTitle}`,
    `극장: ${showtime.theaterName}`,
    `안내된 회차: ${showtime.dateLabel}`,
    `예매 링크: ${bookingUrl}`,
  ].join('\n')

  return createPortal(
    <dialog ref={dialog} className={styles.dialog} data-desktop={desktop} data-overlay-root=""
      aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
      <div className={styles.header}>
        <h2 id={titleId} tabIndex={-1} data-booking-focus>
          {view === 'report' ? '회차 오류 제보하기' : view === 'sent' ? '회차 오류를 제보했어요' : '예매할 회차를 확인해 주세요'}
        </h2>
        {view === 'confirm' && (
          <Button variant="text" size="sm" onClick={() => setView('report')}>
            <Icon name="circle-alert" size={16} /> 제보하기
          </Button>
        )}
      </div>
      <div className={styles.selection}>
        <strong>{showtime.dateLabel}</strong>
        <span>{showtime.movieTitle} · {showtime.theaterName}</span>
      </div>
      <div hidden={view !== 'confirm'}>
        {guide && <Guide guide={guide} />}
        {!guide && <p className={styles.hint}>예매 페이지에서 상영 날짜와 시작 시간이 같은지 확인해 주세요</p>}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>취소</Button>
          {children}
        </div>
      </div>
      {view === 'report' && (
        <>
          <SettingsReportPage initialCategory="데이터 수정"
            initialDetail={reportDetail.slice(0, 360) + '\n예매처에 표시된 회차: '}
            selectedMovieId={showtime.movieId} selectedTheaterName={showtime.theaterName}
            onSuccess={() => setView('sent')} />
          <Button variant="secondary" onClick={() => setView('confirm')}>회차 안내로 돌아가기</Button>
        </>
      )}
      {view === 'sent' && <Button variant="secondary" onClick={() => setView('confirm')}>회차 안내로 돌아가기</Button>}
    </dialog>,
    document.body,
  )
}

function Guide({ guide }: {
  guide: NonNullable<ReturnType<typeof bookingGuide>>
}) {
  return (
    <section className={styles.guide}>
      <strong>확인할 곳</strong>
      <div className={styles.preview}>
        <small>{guide === 'tinyticket' ? 'TinyTicket 좌석 선택 화면 예시' : '상영시간표 화면 예시'}</small>
        {guide === 'tinyticket' ? (
          <>
            <b>‹ 영화 제목</b>
            <div><mark>11/19 15:00</mark>–16:32 · 극장</div>
            <div className={styles.seats}>screen or stage</div>
          </>
        ) : (
          <>
            <div className={styles.dates}>
              {guide === 'moviee' && <span>11월</span>}
              {guide !== 'dureraum' && <span>18(수)</span>}
              <mark>{guide === 'dureraum' ? '11월 19일 (목)' : '19(목)'}</mark>
              {guide !== 'dureraum' && <span>20(금)</span>}
            </div>
            {guide !== 'dureraum' && <b>영화 제목</b>}
            <div><mark>15:00</mark>{guide === 'scinema' && '~16:32'}</div>
          </>
        )}
      </div>
      <p className={styles.hint}>{guide === 'tinyticket'
        ? '좌석을 고르기 전에 영화 제목 바로 아래에서 날짜와 시작 시간을 확인해 주세요'
        : '상영시간표에서 날짜와 해당 회차의 시작 시간을 확인해 주세요'}</p>
    </section>
  )
}
