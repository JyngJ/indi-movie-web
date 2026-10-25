import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-chromium'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { LoadingStatus } from './LoadingStatus'
import styles from './LoadingStatus.module.css'

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('좁은 화면에서도 메뉴 바 위에 유지되고 동작 최소화를 따른다', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 640 } })
    const css = readFileSync('src/styles/tokens.css', 'utf8') + readFileSync('src/components/primitives/LoadingStatus.module.css', 'utf8')
      .replace(/\.(status|floating|inline|spinner)\b/g, (_, name) => `.${styles[name]}`)
    const html = renderToStaticMarkup(<LoadingStatus message="상영 정보를 불러오는 중…" />)
    await page.setContent(`<style>${css}</style>${html}`)
    const status = page.getByRole('status')
    await status.waitFor({ state: 'visible' })
    const box = (await status.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(16)
    expect(box.x + box.width).toBeLessThanOrEqual(304)
    expect(box.y + box.height).toBeLessThanOrEqual(640 - 64 - 16)
    expect(await status.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none')
    const spinner = status.locator('svg')
    expect(await spinner.evaluate(el => getComputedStyle(el).animationName)).not.toBe('none')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await spinner.evaluate(el => getComputedStyle(el).animationName)).toBe('none')
    // 일반 토스트의 표시 시간이 지나도 로딩 안내는 유지한다.
    await page.waitForTimeout(1800)
    expect(await status.isVisible()).toBe(true)
    expect(renderToStaticMarkup(<LoadingStatus visible={false} />)).toBe('')
  } finally { await browser.close() }
}, 20000)
