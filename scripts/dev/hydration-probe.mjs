// 상세 직진입 hydration 스톨 재현 프로브 (docs/HANDOFF-design-refactor.md 3.9)
// 판정: 버튼에 __reactFiber$* 키가 붙었는가(hydration 완료) + 회차 UI가 그려졌는가.
// 사용: node hydration-probe.mjs <baseUrl> <iterations> <label>
import { chromium } from 'playwright-chromium'

const base = process.argv[2]
const N = Number(process.argv[3] ?? 20)
const label = process.argv[4] ?? base
const TIMEOUT = 20000

const ROUTES = [
  ['movie', '/movie/c88a7982-2e2f-4b27-8334-dc8633496560'],
  ['theater', '/films/theater/e99e0631-06f0-4e98-8858-9e8dbc810ec1'],
]

const probe = async (page) => {
  const start = Date.now()
  while (Date.now() - start < TIMEOUT) {
    const state = await page.evaluate(() => {
      const btn = document.querySelector('button')
      if (!btn) return { hydrated: false, reason: 'no-button' }
      const hydrated = Object.keys(btn).some((k) => k.startsWith('__reactFiber$'))
      // react-query가 돌았는지 — 회차 셀이나 "상영" 문구가 본문에 그려졌는지
      const painted = /상영|회차|예매/.test(document.body.innerText)
      return { hydrated, painted }
    })
    if (state.hydrated && state.painted) return { ok: true, ms: Date.now() - start }
    await page.waitForTimeout(150)
  }
  const final = await page.evaluate(() => {
    const btn = document.querySelector('button')
    return {
      hydrated: btn ? Object.keys(btn).some((k) => k.startsWith('__reactFiber$')) : false,
      text: document.body.innerText.slice(0, 80).replace(/\n/g, ' '),
    }
  })
  return { ok: false, ms: TIMEOUT, final }
}

const browser = await chromium.launch()
for (const [name, path] of ROUTES) {
  const fails = []
  const times = []
  for (let i = 0; i < N; i++) {
    // 직진입 = 매번 새 컨텍스트(빈 캐시·빈 스토리지)에서 전체 로드
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    /* 레이스 창을 넓힌다 — 느린 CPU·느린 네트워크에서 selective hydration 경합이 드러난다 */
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: 400 * 1024, uploadThroughput: 200 * 1024,
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)))
    try {
      await page.goto(base + path, { waitUntil: 'commit', timeout: 20000 })
      const r = await probe(page)
      if (r.ok) times.push(r.ms)
      else fails.push({ i, ...r, errors })
    } catch (e) {
      fails.push({ i, ok: false, error: String(e).slice(0, 120) })
    }
    await ctx.close()
  }
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null
  console.log(`[${label}] ${name}: 실패 ${fails.length}/${N} · hydration 평균 ${avg}ms`)
  for (const f of fails.slice(0, 3)) console.log('   실패 상세:', JSON.stringify(f).slice(0, 220))
}
await browser.close()
