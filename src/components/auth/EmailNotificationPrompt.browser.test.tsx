import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { chromium } from 'playwright-chromium'
import { expect, it } from 'vitest'

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('이메일 동의 정렬·편집 이동·의견 버튼·팝업 거절 상태를 보장한다', async () => {
  const bundle = await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {EmailNotificationPrompt} from './src/components/auth/EmailNotificationPrompt'; import {NotificationSettingsContent} from './src/components/auth/NotificationSettingsContent'; import {EmailManagement} from './src/components/auth/EmailManagement'; import {LoginPanel} from './src/components/auth/LoginPanel'; import {EmailPreferencesContent} from './src/components/auth/EmailPreferencesContent'; createRoot(document.getElementById('root')).render(window.previewView==='form'?<div data-form-fixture style={{height:800}}><EmailPreferencesContent/></div>:window.previewView==='login'?<LoginPanel returnTo="/my"/>:window.previewView==='settings'?<NotificationSettingsContent/>:window.previewView==='manage'?<EmailManagement/>:<EmailNotificationPrompt/>);`, resolveDir: process.cwd(), loader: 'tsx' },
    jsx: 'automatic', bundle: true, write: false, outdir: '/tmp/email-ui-contract', platform: 'browser', format: 'iife', tsconfig: 'tsconfig.json',
    define: { 'process.env': '{}', 'process.env.NEXT_PUBLIC_EMAIL_NOTIFICATIONS_ENABLED': '"true"', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'email-ui-state', setup(builder) {
      builder.onResolve({ filter: /(?:^|\/)AuthProvider$/ }, () => ({ path: 'auth', namespace: 'fixture' }))
      builder.onResolve({ filter: /useEmailNotifications$/ }, () => ({ path: 'email', namespace: 'fixture' }))
      builder.onResolve({ filter: /useProgressRouter$/ }, () => ({ path: 'router', namespace: 'fixture' }))
      builder.onResolve({ filter: /useNotifications$/ }, () => ({ path: 'prefs', namespace: 'fixture' }))
      builder.onResolve({ filter: /globalToast$/ }, () => ({ path: 'toast', namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: process.cwd(), contents: args.path === 'auth'
        ? `const user={id:'reader',email:window.googleEmail??null,providers:window.googleEmail?['google']:['kakao']}; export const useAuth=()=>({status:'signed-in',user,signIn:async(provider,returnTo)=>{window.signInRequest={provider,returnTo};if(window.rejectSignIn)throw new Error('provider unavailable');return new Promise(()=>{})}});`
        : args.path === 'router' ? `export const useProgressRouter=()=>({push:url=>{window.navigatedTo=url}});`
        : args.path === 'prefs' ? `export const useNotificationPrefs=()=>({prefs:{newScreening:true,lastWeek:true},save:()=>{}});`
        : args.path === 'toast' ? `export const showGlobalToast=()=>{};`
        : `import {useSyncExternalStore} from 'react'; let data={enabled:true,subscription:window.previewView==='settings'?{status:'active',email:'reader@example.com'}:null}; const listeners=new Set(); const subscribe=f=>{listeners.add(f);return()=>listeners.delete(f)}; const update=async body=>{data={enabled:true,subscription:{prompt_dismissed:true,status:body.action==='register'?'pending':'declined',email:body.email??null}};listeners.forEach(f=>f())}; export function useEmailNotifications(){return {data:useSyncExternalStore(subscribe,()=>data),update}}` }))
    } }],
  })
  const postcss = (await import('postcss')).default
  const tailwind = (await import('@tailwindcss/postcss')).default
  const stylesheet = await postcss([tailwind({ base: process.cwd() })]).process(readFileSync('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 480 } })
    page.on('pageerror', error => console.error('Email UI:', error.message))
    await page.route('http://email-ui.test/**', route => route.fulfill({ contentType: 'text/html', body: '<main><button id="outside">바깥 버튼</button><div id="root"></div></main>' }))
    await page.goto('http://email-ui.test')
    await page.addStyleTag({ content: stylesheet.css })
    await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js'))!.text })
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    expect(await dialog.getAttribute('aria-labelledby')).toBe('email-prompt-title')
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
    const alignment = await page.locator('[data-email-consent]').evaluate(label => {
      const checkbox = label.querySelector('input')!.getBoundingClientRect()
      const copy = label.querySelector('[data-email-consent-copy]')!
      const range = document.createRange()
      range.selectNodeContents(copy)
      const lines = [...range.getClientRects()]
      return { delta: Math.abs(checkbox.y + checkbox.height / 2 - (lines[0].y + lines[0].height / 2)), lines: lines.length }
    })
    expect(alignment.lines).toBeGreaterThan(1)
    expect(alignment.delta).toBeLessThanOrEqual(2)
    await page.keyboard.press('Escape')
    await expect.poll(() => dialog.isVisible()).toBe(false)
    expect(await page.evaluate(() => localStorage.getItem('email-prompt-dismissed:reader'))).toBe('1')
    await page.reload()
    await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js'))!.text })
    await page.waitForTimeout(1200)
    expect(await page.getByRole('dialog').isVisible()).toBe(false)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js'))!.text })
    await page.getByRole('dialog').waitFor()
    await page.getByRole('checkbox').check()
    expect(await page.getByRole('button', { name: '인증 메일 받기' }).isDisabled()).toBe(true)
    await page.getByRole('checkbox').uncheck()
    await page.getByLabel('수신할 메일 주소').fill('invalid-email')
    await page.getByRole('checkbox').check()
    expect(await page.getByRole('button', { name: '인증 메일 받기' }).isDisabled()).toBe(true)
    await page.getByLabel('수신할 메일 주소').fill('reader@example.com')
    await page.getByRole('button', { name: '인증 메일 받기' }).click()
    await expect.poll(() => page.getByRole('dialog').isVisible()).toBe(false)
    await page.reload()
    await page.evaluate(() => { (window as any).previewView = 'settings' })
    await page.addStyleTag({ content: stylesheet.css })
    await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js'))!.text })
    expect(await page.getByRole('textbox').count()).toBe(0)
    expect(await page.getByRole('button', { name: '이메일 소식 그만 받기' }).count()).toBe(0)
    await page.getByRole('button', { name: /이메일로 소식 받기/ }).click()
    expect(await page.evaluate(() => (window as any).navigatedTo)).toBe('/my/notifications/email')
    await page.reload()
    await page.evaluate(() => { (window as any).previewView = 'form'; (window as any).googleEmail = 'google-reader@example.com' })
    await page.addStyleTag({ content: stylesheet.css })
    await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js'))!.text })
    expect(await page.getByLabel('수신할 메일 주소').inputValue()).toBe('google-reader@example.com')
    const submit = page.getByRole('button', { name: '인증 메일 받기' })
    expect(await submit.isDisabled()).toBe(true)
    await page.getByRole('button', { name: '메일 주소 지우기' }).click()
    expect(await page.getByLabel('수신할 메일 주소').inputValue()).toBe('')
    expect(await page.getByLabel('수신할 메일 주소').evaluate(el => el === document.activeElement)).toBe(true)
    expect(await page.getByRole('button', { name: '메일 주소 지우기' }).count()).toBe(0)
    await page.getByRole('checkbox').check()
    expect(await submit.isDisabled()).toBe(true)
    await page.getByLabel('수신할 메일 주소').fill('bad@')
    expect(await submit.isDisabled()).toBe(true)
    await page.getByLabel('수신할 메일 주소').fill('reader@example.com')
    expect(await submit.isEnabled()).toBe(true)
    await page.getByRole('checkbox').uncheck()
    expect(await submit.isDisabled()).toBe(true)
    const centered = await page.locator('[data-form-fixture]').evaluate(container => {
      const card = container.querySelector('form')!.parentElement!.parentElement!.parentElement!.getBoundingClientRect()
      const area = container.getBoundingClientRect()
      return Math.abs(card.y + card.height / 2 - (area.y + area.height / 2))
    })
    expect(centered).toBeLessThanOrEqual(2)
    await page.getByRole('button', { name: '지금은 괜찮아요' }).click()
    expect(await page.evaluate(() => (window as any).navigatedTo)).toBe('/my/notifications')
    expect(await page.evaluate(() => localStorage.getItem('email-prompt-dismissed:reader'))).toBe('1')
    await page.reload()
    await page.evaluate(() => { (window as any).previewView = 'login'; (window as any).rejectSignIn = true })
    await page.addStyleTag({ content: stylesheet.css })
    await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js'))!.text })
    const arrival = page.locator('[data-email-preview-arrival]')
    expect(await arrival.evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(0.1)
    const loginBefore = await page.getByRole('button', { name: 'Google로 계속하기' }).boundingBox()
    await expect.poll(() => arrival.evaluate(el => Number(getComputedStyle(el).opacity))).toBe(1)
    await expect.poll(() => arrival.evaluate(el => getComputedStyle(el).transform)).toBe('none')
    const loginAfter = await page.getByRole('button', { name: 'Google로 계속하기' }).boundingBox()
    expect(loginAfter?.y).toBe(loginBefore?.y)
    expect(await page.getByRole('img', { name: /메일 예시/ }).isVisible()).toBe(true)
    await page.getByRole('button', { name: 'Google로 계속하기' }).click()
    expect(await page.evaluate(() => (window as any).signInRequest)).toEqual({ provider: 'google', returnTo: '/my' })
    await page.getByRole('alert').waitFor()
    expect(await page.getByRole('alert').textContent()).toContain('카카오로 로그인')
    expect(await page.getByRole('button', { name: '카카오 로그인' }).isEnabled()).toBe(true)
    await page.evaluate(() => { (window as any).rejectSignIn = false })
    await page.getByRole('button', { name: '카카오 로그인' }).click()
    expect(await page.evaluate(() => (window as any).signInRequest)).toEqual({ provider: 'kakao', returnTo: '/my' })
    expect(await page.getByRole('button', { name: 'Google로 계속하기' }).isDisabled()).toBe(true)
    expect(await page.getByRole('button', { name: '이동 중…' }).isDisabled()).toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await page.evaluate(() => { (window as any).previewView = 'login' })
    await page.addStyleTag({ content: stylesheet.css })
    await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js'))!.text })
    expect(await page.locator('[data-email-preview-arrival]').evaluate(el => Number(getComputedStyle(el).opacity))).toBe(1)
    expect(await page.locator('[data-email-preview-arrival]').evaluate(el => getComputedStyle(el).transform)).toBe('none')
    expect(await page.locator('[data-email-preview-envelope], [data-email-preview-spark]').count()).toBe(0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    for (const [choice, label] of [['more', '더 자주'], ['same', '지금 정도'], ['less', '더 가끔']]) {
      await page.setViewportSize(choice === 'more' ? { width: 360, height: 640 } : { width: 1100, height: 850 })
      await page.goto(`http://email-ui.test/email/manage?action=frequency&token=fixture&choice=${choice}`)
      await page.evaluate(() => { (window as any).previewView = 'manage' })
      await page.addStyleTag({ content: stylesheet.css })
      await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js'))!.text })
      const metrics = await page.locator('main > div > div').evaluate(card => {
        const style = getComputedStyle(card)
        const main = getComputedStyle(card.closest('main')!)
        const tokenValue = (name: string) => { const probe = document.createElement('div'); probe.style.paddingLeft = `var(${name})`; card.appendChild(probe); const value = getComputedStyle(probe).paddingLeft; probe.remove(); return value }
        return { padding: style.paddingLeft, gap: style.rowGap, expectedPadding: tokenValue(innerWidth >= 640 ? '--gutter-form-wide' : '--gutter-form'), expectedGap: tokenValue('--gap-form-section'), gutter: main.paddingLeft, expectedGutter: tokenValue('--gutter-form') }
      })
      expect(metrics.padding).toBe(metrics.expectedPadding)
      expect(metrics.gap).toBe(metrics.expectedGap)
      expect(metrics.gutter).toBe(metrics.expectedGutter)
      const choices = page.locator('[aria-label="발송 빈도 의견"]').getByRole('button')
      const buttons = await choices.evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element)
        return { y: rect.y, height: rect.height, color: style.backgroundColor }
      }))
      expect(buttons).toHaveLength(3)
      expect(new Set(buttons.map(button => button.y)).size).toBe(1)
      expect(new Set(buttons.map(button => button.color)).size).toBe(1)
      expect(buttons.every(button => button.height >= 44)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      let submitted: unknown
      await page.route('**/api/email-notifications/manage', route => {
        submitted = route.request().postDataJSON()
        return route.fulfill({ contentType: 'application/json', body: '{"ok":true}' })
      })
      await page.getByRole('button', { name: label, exact: true }).click()
      await page.getByRole('heading', { name: '의견을 보냈어요' }).waitFor()
      expect(submitted).toMatchObject({ choice, action: 'frequency' })
      await page.unroute('**/api/email-notifications/manage')
    }
  } finally { await browser.close() }
}, 30000)
