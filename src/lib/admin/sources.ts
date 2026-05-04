import type { AdminTheaterSource } from '@/types/admin'

export const ADMIN_THEATER_SOURCES: AdminTheaterSource[] = []

export const SAMPLE_CRAWL_HTML = `
<section class="schedule">
  <article class="showtime" data-screen="1관">
    <time datetime="2026-05-04T13:20:00+09:00">2026.05.04 13:20</time>
    <strong>우리에게 내일은 없다</strong>
    <span>2K</span><span>95석</span><a href="https://booking.example/1">예매</a>
  </article>
  <article class="showtime" data-screen="2관">
    <time datetime="2026-05-04T16:10:00+09:00">2026.05.04 16:10</time>
    <strong>초록밤</strong>
    <span>GV</span><span>잔여 42/80</span><a href="https://booking.example/2">예매</a>
  </article>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "수라",
    "startDate": "2026-05-05T19:30:00+09:00",
    "location": { "name": "인디스페이스 1관" },
    "offers": { "url": "https://booking.example/3", "price": "12000" }
  }
  </script>
</section>
`

export const SAMPLE_CRAWL_CSV = `movieTitle,showDate,showTime,screenName,formatType,seatAvailable,seatTotal,price,bookingUrl
지난 여름,2026-05-05,11:30,1관,standard,64,96,11000,https://booking.example/4
해야 할 일,2026-05-05,14:20,2관,2k,23,80,12000,https://booking.example/5`
