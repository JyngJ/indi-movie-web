import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { chromium } from 'playwright-chromium'
import { expect, it } from 'vitest'

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('상세 본문 그림자가 레일 위에 보이고 본문을 침범하거나 클릭을 막지 않는다', async () => {
  const bundle = await build({
    stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{DetailShell}from'./src/components/navigation/DetailShell';createRoot(document.getElementById('root')).render(<DetailShell><button>본문</button></DetailShell>);`, resolveDir: process.cwd(), loader: 'tsx' },
    jsx: 'automatic', bundle: true, write: false, platform: 'browser', format: 'iife', tsconfig: 'tsconfig.json',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'detail-fixture', setup(builder) {
      builder.onResolve({ filter: /\/(GlobalNav|FeedPanel|MyPanel|SettingsPanel|uiStore)$/ }, (args) => ({ path: args.path.split('/').pop()!, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({ loader: 'tsx', resolveDir: process.cwd(), contents: {
        GlobalNav: `export const GLOBAL_NAV_DESKTOP_WIDTH=80;export const GlobalNav=()=> <nav style={{position:'fixed',left:0,top:0,bottom:0,width:80,zIndex:1150,background:'#eae5e1'}}/>;`,
        FeedPanel: 'export const FeedPanel=()=>null;',
        MyPanel: 'export const MyPanel=()=>null;',
        SettingsPanel: 'export const SettingsPanel=()=>null;',
        uiStore: 'export const useUIStore=selector=>selector({});',
      }[args.path]! }))
    } }],
  })
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.setContent('<div id="root"></div>')
    await page.addStyleTag({ content: readFileSync('src/styles/tokens.css', 'utf8') + 'body{margin:0}' })
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    const metrics = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[aria-hidden]')]
      .map((el) => ({ el, css: getComputedStyle(el) }))
      .filter(({ css }) => css.boxShadow !== 'none')
      .map(({ el, css }) => ({ x: el.getBoundingClientRect().x, height: el.getBoundingClientRect().height, z: Number(css.zIndex), pointer: css.pointerEvents, clip: css.clipPath, shadow: css.boxShadow })))
    await expect.poll(async () => (await metrics()).length).toBe(1)
    const [cast] = await metrics()
    expect(cast.x).toBe(80)
    expect(cast.height).toBe(800)
    expect(cast.z).toBeGreaterThan(1150)
    expect(cast.pointer).toBe('none')
    expect(cast.clip).toBe('inset(-24px 0px -24px -24px)')
    expect(cast.shadow).toContain('rgba(20, 15, 10')
    await page.getByRole('button', { name: '본문' }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect.poll(async () => (await metrics()).length).toBe(0)
  } finally { await browser.close() }
}, 30000)
