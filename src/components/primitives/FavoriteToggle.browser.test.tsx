import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-chromium'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { FavoriteToggle } from './FavoriteToggle'
import styles from './FavoriteToggle.module.css'

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('관심 상태의 색·접근성·너비와 reduced motion을 보장한다', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const html = renderToStaticMarkup(<><FavoriteToggle active={false} activeLabel="관심 영화" /><FavoriteToggle active activeLabel="관심 영화" /></>)
    const css = readFileSync('src/styles/tokens.css', 'utf8') + readFileSync('src/components/primitives/FavoriteToggle.module.css', 'utf8').replace(/\.(control|heart|label|reserve|visible)\b/g, (_, name) => `.${styles[name]}`)
    await page.setContent(`<style>${css}</style>${html}`)
    const off = page.getByRole('button', { name: '관심 등록', exact: true })
    const on = page.getByRole('button', { name: '관심 영화', exact: true })
    expect(await off.getAttribute('aria-pressed')).toBe('false')
    expect(await on.getAttribute('aria-pressed')).toBe('true')
    expect((await off.boundingBox())!.width).toBe((await on.boundingBox())!.width)
    const selectedColor = await on.evaluate(button => getComputedStyle(button).backgroundColor)
    expect(selectedColor).not.toBe(await off.evaluate(button => getComputedStyle(button).backgroundColor))
    const expected = await page.evaluate(() => {
      const sample = document.createElement('div')
      sample.style.backgroundColor = 'var(--comp-favorite-bg-active)'
      document.body.appendChild(sample)
      const color = getComputedStyle(sample).backgroundColor
      sample.remove()
      return color
    })
    expect(selectedColor).toBe(expected)
    const heart = on.locator(`.${styles.heart}`)
    expect(await heart.evaluate(el => getComputedStyle(el).animationName)).not.toBe('none')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await heart.evaluate(el => getComputedStyle(el).animationName)).toBe('none')
    expect(await on.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s')
  } finally { await browser.close() }
}, 20000)
