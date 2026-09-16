import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-chromium'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { RailPopover } from './RailPopover'
import { MenuCard, MenuRow } from '@/components/primitives'

// Chromium 설치 환경에서 RUN_BROWSER_TESTS=1로 실행한다.
it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('낮은 팝오버에서도 메뉴를 축소하지 않고 마지막 행까지 스크롤한다', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 560 } })
    const html = renderToStaticMarkup(
      <RailPopover open onClose={() => {}} title="MY" anchorHref="/my" ariaLabel="MY">
        <div style={{ height: 200 }}>프로필 영역</div>
        {['관심 메뉴', '안내 메뉴'].map(group => (
          <MenuCard key={group}>
            {[1, 2, 3].map(n => <MenuRow key={n} title={`${group} ${n}`} description="메뉴 설명" onClick={() => {}} last={n === 3} />)}
          </MenuCard>
        ))}
        <div style={{ height: 80 }}>푸터</div>
      </RailPopover>,
    )
    const css = readFileSync('src/styles/tokens.css', 'utf8') + readFileSync('src/app/globals.css', 'utf8').replace(/^@import.*$/gm, '')
    await page.setContent(`<style>${css}</style>${html}`)
    const measurements = await page.getByRole('button').filter({ hasText: /메뉴 [123]/ }).evaluateAll(rows => rows.map(row => {
      const card = row.parentElement!.getBoundingClientRect()
      const rect = row.getBoundingClientRect()
      return { height: rect.height, contained: rect.top >= card.top && rect.bottom <= card.bottom + 1 }
    }))
    expect(measurements).toHaveLength(6)
    expect(measurements.every(row => row.contained)).toBe(true)
    expect(Math.max(...measurements.map(row => row.height)) - Math.min(...measurements.map(row => row.height))).toBeLessThanOrEqual(1)
    const last = page.getByRole('button', { name: '안내 메뉴 3 메뉴 설명' })
    await last.scrollIntoViewIfNeeded()
    const reachable = await last.evaluate(row => {
      const rect = row.getBoundingClientRect()
      const dialog = row.closest('[role="dialog"]')!.getBoundingClientRect()
      return rect.top >= dialog.top && rect.bottom <= dialog.bottom
    })
    expect(reachable).toBe(true)
  } finally { await browser.close() }
}, 20000)
