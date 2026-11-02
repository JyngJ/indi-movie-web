import { chromium, type Page } from 'playwright-chromium'
import { expect, it } from 'vitest'
import { buildTheaterHardenFixture, fixtureMovies, fixtureShowtimes } from '../../../scripts/test-fixtures/theaterHarden'

const today = () => new Date().toLocaleDateString('sv-SE')

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('첫 조회 실패는 빈 결과와 구분하고 재시도·재조회 실패 시 기존 내용을 보존한다', async () => {
  const html = await buildTheaterHardenFixture()
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    let failed = true
    await page.route('https://fixture.test/**', async route => {
      const url = new URL(route.request().url())
      if (url.pathname.startsWith('/fixture/')) return route.fulfill({ status: failed ? 503 : 200, json: url.pathname.endsWith('movies') ? fixtureMovies(today()) : fixtureShowtimes(today()) })
      await route.fulfill({ contentType: 'text/html', body: html })
    })
    await page.goto('https://fixture.test/')
    await page.getByRole('alert').filter({ hasText: '상영작을 불러오지 못했어요' }).waitFor()
    await page.getByRole('alert').filter({ hasText: '상영 시간표를 불러오지 못했어요' }).waitFor()
    expect(await page.getByText('선택한 날짜에 상영 정보가 없어요').count()).toBe(0)
    failed = false
    await page.getByRole('alert').filter({ hasText: '상영 시간표를 불러오지 못했어요' }).getByRole('button').click()
    await page.getByRole('alert').filter({ hasText: '상영작을 불러오지 못했어요' }).getByRole('button').click()
    await page.getByText('19:30', { exact: true }).waitFor()
    await expect.poll(() => page.getByRole('alert').count()).toBe(0)
    failed = true
    await page.evaluate(async () => { await (window as any).fixture.client.invalidateQueries() })
    await page.getByText('19:30', { exact: true }).waitFor()
    expect(await page.getByRole('alert').count()).toBe(0)
    failed = false
    await page.route('**/fixture/showtimes?*', route => route.fulfill({ json: { movies: [], showtimes: [] } }))
    await page.evaluate(async () => { await (window as any).fixture.client.invalidateQueries({ queryKey: ['theater-showtimes'] }) })
    await page.getByText('선택한 날짜에 상영 정보가 없어요').waitFor()
  } finally { await browser.close() }
}, 30000)

async function beginDrag(page: Page) {
  await page.mouse.move(100, 100)
  await page.mouse.down()
  await expect.poll(() => page.locator('#gesture').getAttribute('data-dragging')).toBe('true')
  await page.mouse.move(100, 300, { steps: 4 })
  return page.evaluate(() => (window as any).fixture.pointerId as number)
}

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('드래그 취소·캡처 상실·창 전환은 닫지 않고 복구하며 다음 정상 드래그를 보장한다', async () => {
  const html = await buildTheaterHardenFixture()
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.route('https://fixture.test/**', route => {
      const url = new URL(route.request().url())
      if (url.pathname.startsWith('/fixture/')) return route.fulfill({ json: url.pathname.endsWith('movies') ? fixtureMovies(today()) : fixtureShowtimes(today()) })
      return route.fulfill({ contentType: 'text/html', body: html })
    })
    await page.goto('https://fixture.test/gesture')
    await page.locator('#gesture').waitFor()
    for (const event of ['pointercancel', 'lostpointercapture', 'blur']) {
      const pointerId = await beginDrag(page)
      if (event === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')))
      else await page.locator('#gesture').dispatchEvent(event, { pointerId, clientY: 300 })
      await expect.poll(() => page.locator('#gesture').getAttribute('data-dragging')).toBe('false')
      expect(await page.evaluate(() => (window as any).fixture.hits)).toEqual({ close: 0, collapse: 0, expand: 0 })
      await page.mouse.up()
    }
    const activePointerId = await beginDrag(page)
    // 브라우저가 다시 발급할 수 있는 포인터 번호를 고정값으로 가정하지 않는다.
    const otherPointerId = activePointerId + 1
    await page.locator('#gesture').dispatchEvent('pointerdown', { pointerId: otherPointerId, button: 0, clientY: 10 })
    await page.locator('#gesture').dispatchEvent('pointercancel', { pointerId: otherPointerId, clientY: 10 })
    try {
      await expect.poll(() => page.locator('#gesture').getAttribute('data-dragging')).toBe('true')
    } catch (error) {
      console.error('드래그 이벤트 기록', await page.evaluate(() => (window as any).fixture.events))
      throw error
    }
    await page.mouse.up()
    await expect.poll(async () => {
      const hits = await page.evaluate(() => (window as any).fixture.hits)
      return hits.close + hits.collapse
    }).toBe(1)
    await expect.poll(() => page.locator('#gesture').getAttribute('data-dragging')).toBe('false')
    await page.goto('https://fixture.test/?sheet=1')
    await page.getByText('19:30', { exact: true }).waitFor()
    await page.mouse.move(100, 5)
    await page.mouse.down()
    await page.mouse.move(100, 210, { steps: 4 })
    const sheetPointerId = await page.evaluate(() => (window as any).fixture.pointerId as number)
    await page.locator('#root > div:not([role])').dispatchEvent('pointercancel', { pointerId: sheetPointerId, clientY: 210 })
    await page.mouse.up()
    expect(await page.getByText('극장 시트가 닫혔어요').count()).toBe(0)
    expect(await page.getByText('검증용 극장', { exact: true }).count()).toBeGreaterThan(0)
  } finally { await browser.close() }
}, 30000)
