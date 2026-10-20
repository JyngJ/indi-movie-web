import { build } from 'esbuild'
import { chromium } from 'playwright-chromium'
import { expect, it } from 'vitest'

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('사진 URL 공백과 이미지 로드 실패에서 이니셜을 보이고 URL 변경 시 사진을 다시 시도한다', async () => {
  const bundle = await build({
    stdin: {
      contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Avatar}from'./src/components/primitives/Avatar';function Fixture(){const[url,setUrl]=useState('https://avatar.test/broken.png');return <><button onClick={()=>setUrl('https://avatar.test/working.png')}>사진 변경</button><button onClick={()=>setUrl('   ')}>사진 지우기</button><Avatar name="재용" photoUrl={url} size={44}/></>}createRoot(document.getElementById('root')).render(<Fixture/>);`,
      resolveDir: process.cwd(), loader: 'tsx',
    },
    jsx: 'automatic', bundle: true, write: false,
    loader: { '.css': 'empty', '.module.css': 'empty' },
    platform: 'browser', format: 'iife', tsconfig: 'tsconfig.json',
    define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
  })
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.route('https://avatar.test/broken.png', route => route.abort())
    await page.route('https://avatar.test/working.png', route => route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pE8AAAAASUVORK5CYII=', 'base64'),
    }))
    await page.setContent('<div id="root"></div>')
    await page.addScriptTag({ content: bundle.outputFiles[0].text })

    await page.locator('span').waitFor()
    expect(await page.locator('img').count()).toBe(0)
    expect(await page.locator('span').textContent()).toBe('재')

    await page.getByRole('button', { name: '사진 변경' }).click()
    await page.locator('img').waitFor()
    expect(await page.locator('img').getAttribute('src')).toBe('https://avatar.test/working.png')
    expect(await page.locator('img').getAttribute('alt')).toBe('재용 프로필 사진')
    expect(await page.locator('span').count()).toBe(0)

    await page.getByRole('button', { name: '사진 지우기' }).click()
    await page.locator('span').waitFor()
    expect(await page.locator('img').count()).toBe(0)
    expect(await page.locator('span').textContent()).toBe('재')
  } finally {
    await browser.close()
  }
}, 20000)
