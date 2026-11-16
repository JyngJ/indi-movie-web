import { formatDateLabel } from '@/lib/date'

export function formatBookingDate(date: string, time: string) {
  return `${formatDateLabel(date).replace('(', ' (')} ${time.slice(0, 5)}`
}

export function bookingGuide(url: string, desktop: boolean) {
  let destination: URL
  try {
    destination = new URL(url)
  } catch {
    return undefined
  }

  const host = destination.hostname.replace(/^www\./, '')
  if (host === 'tinyticket.net' && /^\/event\/[^/]+\/?$/.test(destination.pathname)) {
    return 'tinyticket'
  }
  if (!desktop) return undefined
  if (host === 'scinema.org' || host.endsWith('.scinema.org')) return 'scinema'
  if (host === 'moviee.co.kr' || host.endsWith('.moviee.co.kr')) return 'moviee'
  if (host === 'dureraum.org' && destination.pathname.endsWith('/view.do')) return 'dureraum'
}
