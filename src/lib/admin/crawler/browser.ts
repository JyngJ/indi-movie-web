import type { CrawledShowtimeCandidate } from '@/types/admin'
import type { ParseContext } from './utils'
import { dedupeCandidates } from './utils'

export async function crawlTinyticketEventManager(context: ParseContext): Promise<CrawledShowtimeCandidate[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { chromium } = await import(/* webpackIgnore: true */ 'playwright-chromium' as any)
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const eventData: Record<string, { name?: string; time?: number; runningTime?: number }> = {}

    page.on('response', async (res: { url(): string; json(): Promise<unknown>; status(): number }) => {
      if (!res.url().includes('api.tinyticket')) return
      try {
        const json = await res.json() as { jsonGraph?: { tinyEventById?: typeof eventData } }
        if (json.jsonGraph?.tinyEventById) {
          Object.assign(eventData, json.jsonGraph.tinyEventById)
        }
      } catch { /* ignore non-JSON */ }
    })

    await page.goto(context.source.listingUrl, { waitUntil: 'networkidle', timeout: 60_000 })
    await browser.close()

    const KST = 9 * 60 * 60 * 1000
    const now = Date.now()
    const candidates: CrawledShowtimeCandidate[] = []

    for (const event of Object.values(eventData)) {
      if (!event.name || typeof event.time !== 'number') continue
      if (event.time < now - 60 * 60 * 1000) continue // skip events ended >1h ago

      const kstMs = event.time + KST
      const iso = new Date(kstMs).toISOString()
      const showDate = iso.slice(0, 10)
      const showTime = iso.slice(11, 16)

      let endTime: string | undefined
      if (event.runningTime) {
        const endKst = event.time + event.runningTime + KST
        endTime = new Date(endKst).toISOString().slice(11, 16)
      }

      const movieTitle = event.name.trim()
      const screenName = '상영관'
      const fp = `${context.source.id}|${movieTitle}|${showDate}|${showTime}|${screenName}`
        .toLowerCase()
        .replace(/\s+/g, ' ')

      candidates.push({
        id: crypto.randomUUID(),
        sourceId: context.source.id,
        theaterId: context.source.id,
        theaterName: context.source.theaterName,
        movieTitle,
        screenName,
        showDate,
        showTime,
        endTime,
        formatType: 'standard',
        language: 'korean',
        seatTotal: 0,
        seatAvailable: 0,
        price: 0,
        bookingUrl: context.source.listingUrl,
        rawText: JSON.stringify(event),
        confidence: 0.9,
        warnings: [],
        fingerprint: fp.slice(0, 128),
        status: 'draft',
      })
    }

    return dedupeCandidates(candidates)
  } catch (err) {
    await browser.close().catch(() => {})
    throw err
  }
}
