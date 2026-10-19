import { resolve } from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright-chromium'
import { expect, it } from 'vitest'

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('로그인 조회 실패·지연과 외부 로그인 뒤로가기에서 복구한다', async () => {
  const bundle = await build({
    stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{AuthProvider,useAuth}from'./src/components/auth/AuthProvider';import{LoginPanel}from'./src/components/auth/LoginPanel';function Probe(){const auth=useAuth();return <output data-status={auth.status}>{auth.status}</output>}createRoot(document.getElementById('root')).render(<AuthProvider><Probe/><LoginPanel/></AuthProvider>);`, resolveDir: process.cwd(), loader: 'tsx' },
    jsx: 'automatic', bundle: true, write: false, loader: { '.css': 'empty', '.module.css': 'empty' }, platform: 'browser', format: 'iife', tsconfig: 'tsconfig.json',
    define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'auth-return-fixture', setup(builder) {
      builder.onResolve({ filter: /supabaseAuthRepository$/ }, () => ({ path: 'repo', namespace: 'fixture' }))
      builder.onResolve({ filter: /(?:analytics\/client|globalToast)$/ }, () => ({ path: 'effects', namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'effects'
        ? `export const identifyUser=()=>{};export const resetAnalyticsUser=()=>{};export const trackEvent=()=>{};export const showGlobalToast=()=>{};`
        : `export const createSupabaseAuthRepository=()=>({getCurrentUser:()=>{window.authReadCount=(window.authReadCount??0)+1;if(window.authMode==='reject')return Promise.reject(Error('offline'));if(window.authMode==='hang')return new Promise(resolve=>{window.resolveOldAuth=resolve});return Promise.resolve(window.authMode==='member'?{id:'reader',displayName:'reader',providers:['google']}:null)},onAuthStateChange:cb=>{window.emitAuth=cb;return()=>{window.emitAuth=()=>{}}},signInWithProvider:async()=>{},signOut:async()=>{},updateDisplayName:async()=>null,deleteAccount:async()=>{}});` }))
    } }],
  })
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('http://auth-return.test/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
    const mount = async (mode: string) => {
      await page.goto('http://auth-return.test')
      await page.evaluate(mode => { (window as any).authMode = mode }, mode)
      await page.addScriptTag({ content: bundle.outputFiles[0].text })
    }
    await mount('reject')
    await page.locator('[data-status="signed-out"]').waitFor()
    expect(errors).toEqual([])

    await page.clock.install()
    await mount('hang')
    await page.locator('[data-status="loading"]').waitFor()
    await page.clock.fastForward(8001)
    await page.locator('[data-status="signed-out"]').waitFor()
    await page.evaluate(() => {
      (window as any).authMode = 'member'
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    })
    await page.locator('[data-status="signed-in"]').waitFor()
    await page.evaluate(() => (window as any).resolveOldAuth(null))
    expect(await page.locator('output').getAttribute('data-status')).toBe('signed-in')

    await mount('guest')
    await page.locator('[data-status="signed-out"]').waitFor()
    await page.getByRole('button', { name: 'Google로 계속하기' }).click()
    expect(await page.getByRole('button', { name: '이동 중…' }).isDisabled()).toBe(true)
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
    await expect.poll(() => page.getByRole('button', { name: 'Google로 계속하기' }).isEnabled()).toBe(true)
    expect(await page.evaluate(() => (window as any).authReadCount)).toBe(2)
    expect(errors).toEqual([])
  } finally { await browser.close() }
}, 30000)
