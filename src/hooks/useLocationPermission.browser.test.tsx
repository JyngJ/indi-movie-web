import { build } from 'esbuild'
import { chromium } from 'playwright-chromium'
import { expect, it } from 'vitest'

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('현재위치 재요청이 건너뛰기를 무시하고 차단 안내와 새 좌표를 반환한다', async () => {
  const bundle = await build({
    stdin: { contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{useLocationPermission}from'./src/hooks/useLocationPermission';function Probe(){const p=useLocationPermission();const[result,setResult]=useState(null);return <><output data-state={p.state} data-suppressed={String(p.modalSuppressed)}>{JSON.stringify(result)}</output><button onClick={()=>{p.dismiss();p.suppressModal()}}>건너뛰기</button><button disabled={p.state==='requesting'} onClick={async()=>setResult(await p.refetch())}>현재위치</button></>}createRoot(document.getElementById('root')).render(<Probe/>);`, resolveDir: process.cwd(), loader: 'tsx' },
    jsx: 'automatic', bundle: true, write: false, platform: 'browser', format: 'iife', tsconfig: 'tsconfig.json',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'location-fixture', setup(builder) {
      builder.onResolve({ filter: /adapters\/location$/ }, () => ({ path: 'adapter', namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const locationAdapter={loadCache:()=>null,getPermissionState:async()=> 'prompt',getCurrentPosition:async()=>{throw Error('silent request used')},saveCache:c=>{window.savedCoords=c},requestPosition:()=>{window.requestCount=(window.requestCount??0)+1;return new Promise((resolve,reject)=>{window.resolveLocation=resolve;window.rejectLocation=reject})}};` }))
    } }],
  })
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.route('http://location-request.test/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
    await page.goto('http://location-request.test')
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    await page.locator('[data-state="prompt"]').waitFor()
    await page.getByRole('button', { name: '건너뛰기' }).click()
    expect(await page.locator('output').getAttribute('data-suppressed')).toBe('true')
    await page.getByRole('button', { name: '현재위치' }).click()
    expect(await page.locator('output').getAttribute('data-state')).toBe('requesting')
    expect(await page.locator('output').getAttribute('data-suppressed')).toBe('false')
    expect(await page.getByRole('button', { name: '현재위치' }).isDisabled()).toBe(true)
    expect(await page.evaluate(() => (window as any).requestCount)).toBe(1)
    await page.evaluate(() => (window as any).rejectLocation({ code: 1 }))
    await page.locator('[data-state="denied"]').waitFor()
    expect(await page.locator('output').textContent()).toBe('null')
    await page.getByRole('button', { name: '현재위치' }).click()
    await page.evaluate(() => (window as any).resolveLocation({ lat: 35, lng: 129 }))
    await page.locator('[data-state="success"]').waitFor()
    await expect.poll(() => page.locator('output').textContent()).toBe('{"lat":35,"lng":129}')
    expect(await page.evaluate(() => (window as any).savedCoords)).toEqual({ lat: 35, lng: 129 })
    expect(await page.evaluate(() => (window as any).requestCount)).toBe(2)
  } finally { await browser.close() }
}, 20000)
