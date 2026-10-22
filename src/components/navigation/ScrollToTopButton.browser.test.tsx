import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { chromium } from 'playwright-chromium'
import { expect, it } from 'vitest'

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('로그인한 소식의 내부 스크롤을 올리고 비로그인·맨 위에서는 숨긴다', async () => {
  const bundle = await build({
    stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import FeedPage from './src/app/(tabs)/feed/page';import{FeedPanel}from'./src/components/domain/favorites/FeedPanel';createRoot(document.getElementById('root')).render(window.panel?<FeedPanel/>:<FeedPage/>);`, resolveDir: process.cwd(), loader: 'tsx' },
    jsx: 'automatic', bundle: true, write: false, loader: { '.css': 'empty', '.module.css': 'empty' }, platform: 'browser', format: 'iife', tsconfig: 'tsconfig.json',
    define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'feed-fixture', setup(builder) {
      builder.onResolve({ filter: /(?:^|\/)AuthProvider$/ }, () => ({ path: 'auth', namespace: 'fixture' }))
      builder.onResolve({ filter: /(?:^|\/)FeedContent$/ }, () => ({ path: 'feed', namespace: 'fixture' }))
      builder.onResolve({ filter: /(?:^|\/)SettingsPanel$/ }, () => ({ path: 'header', namespace: 'fixture' }))
      builder.onResolve({ filter: /(?:^|\/)GlobalNav$/ }, () => ({ path: 'nav', namespace: 'fixture' }))
      builder.onResolve({ filter: /(?:^|\/)uiStore$/ }, () => ({ path: 'store', namespace: 'fixture' }))
      builder.onResolve({ filter: /^next\/(navigation|link)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'tsx', resolveDir: process.cwd(), contents: {
        auth: `export const useAuth=()=>({status:window.signedOut?'signed-out':'signed-in'});`,
        feed: `export const FeedContent=()=> <div data-feed style={{height:2400}}>소식 목록</div>;`,
        header: `export const SettingsHeader=()=> <header style={{height:56,flexShrink:0}}>소식</header>;`,
        nav: `export const GLOBAL_NAV_DESKTOP_WIDTH=80;`,
        store: `export const useUIStore=selector=>selector({isFeedOpen:true,setFeedOpen:()=>{}});`,
        'next/navigation': `export const useSearchParams=()=>new URLSearchParams();`,
        'next/link': `export default function Link({children,href,...props}){return <a href={href} {...props}>{children}</a>}`,
      }[args.path]! }))
    } }],
  })
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } })
    const css = readFileSync('src/styles/tokens.css', 'utf8') + '*{box-sizing:border-box}body{margin:0}'
    await page.route('http://feed-scroll.test/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
    const mount = async (signedOut = false, panel = false) => {
      await page.goto('http://feed-scroll.test')
      await page.evaluate(({ signedOut, panel }) => { Object.assign(window, { signedOut, panel }) }, { signedOut, panel })
      await page.addStyleTag({ content: css })
      await page.addScriptTag({ content: bundle.outputFiles[0].text })
      await page.locator('[data-feed]').waitFor()
    }
    const scroll = async (top: number) => page.locator('[data-feed]').evaluate((el, top) => el.parentElement!.scrollTo(0, top), top)
    const button = page.getByRole('button', { name: '맨 위로', exact: true })
    await mount()
    expect(await button.count()).toBe(0)
    await scroll(1)
    await button.waitFor()
    const rect = (await button.boundingBox())!
    expect(rect.y + rect.height).toBeLessThanOrEqual(800 - 64)
    await button.click()
    await expect.poll(() => page.locator('[data-feed]').evaluate(el => el.parentElement!.scrollTop)).toBe(0)
    expect(await button.count()).toBe(0)
    await mount(true)
    await scroll(200)
    expect(await button.count()).toBe(0)
    await page.setViewportSize({ width: 1280, height: 800 })
    await mount(false, true)
    await scroll(200)
    await button.waitFor()
    const within = await button.evaluate(el => {
      const a = el.getBoundingClientRect(), b = el.closest('[role="dialog"]')!.getBoundingClientRect()
      return a.left >= b.left && a.right <= b.right && a.bottom <= b.bottom
    })
    expect(within).toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await button.click()
    await expect.poll(() => page.locator('[data-feed]').evaluate(el => el.parentElement!.scrollTop)).toBe(0)
  } finally { await browser.close() }
}, 30000)
