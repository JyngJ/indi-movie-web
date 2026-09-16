import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-chromium'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { PosterGrid } from './PosterGrid'
import type { PosterSlot } from '@/lib/map/posterLogic'

// Chromium 설치 환경에서 RUN_BROWSER_TESTS=1로 실행한다.
it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('포스터 호버 팝업이 같은 마커의 코너 칩보다 위에 그려진다', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const movie = { id: 'm1', title: '사진의 얼굴', genre: ['인물', '역사'], director: ['고경영'], nation: '한국', showtimesToday: [{ time: '12:50' }] }
    const slots = [{ movie }, { movie: { ...movie, id: 'm2' } }] as unknown as PosterSlot[]
    const html = renderToStaticMarkup(<PosterGrid slots={slots} posterW={74} posterH={110} overflowCount={12} favoriteCount={1} />)
    const css = readFileSync('src/styles/tokens.css', 'utf8') + readFileSync('src/app/globals.css', 'utf8').replace(/^@import.*$/gm, '')
    await page.setContent(`<style>${css}</style><div style="position:absolute;left:200px;top:200px">${html}</div>`)
    await page.locator('.pm-wrap').first().hover()
    // hit-testing만 활성화한다. 실제 팝업은 pointer-events:none이지만 그려지는 순서는 같다.
    await page.addStyleTag({ content: '.pm-tip { pointer-events:auto; }' })
    const result = await page.evaluate(() => {
      const tip = document.querySelector('.pm-tip')!.getBoundingClientRect()
      const chip = document.querySelector('.pm-chip-stack')!.getBoundingClientRect()
      const x = Math.max(tip.left, chip.left) + 2
      const y = Math.max(tip.top, chip.top) + 2
      return { overlaps: x < Math.min(tip.right, chip.right) && y < Math.min(tip.bottom, chip.bottom), top: !!document.elementFromPoint(x, y)?.closest('.pm-tip') }
    })
    expect(result).toEqual({ overlaps: true, top: true })
  } finally { await browser.close() }
}, 20000)
