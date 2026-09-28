import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { chromium } from 'playwright-chromium'
import { expect, it } from 'vitest'

// 데스크톱은 본문 상단, 모바일은 하단 메뉴 바(64px) 바로 위에 붙는다.
const LAYOUTS = [
  { name: '데스크톱', isDesktop: true, edge: 'top', expected: '0px' },
  { name: '모바일', isDesktop: false, edge: 'bottom', expected: '64px' },
] as const

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1').each(LAYOUTS)('$name: 상세 이동을 시작하면 진행 표시가 뜨고 목적지 반영 후 종료한다', async ({ isDesktop, edge, expected }) => {
  const root = process.cwd()
  const temp = mkdtempSync(join(root, '.ui-navigation-'))
  const browser = await chromium.launch()
  try {
    // Next의 경로 반영만 제어하고 진행 표시와 이동 훅은 실제 제품 코드를 실행한다.
    writeFileSync(join(temp, 'navigation.js'), `
      import { useSyncExternalStore } from 'react';
      let path = '/movie/1'; const listeners = new Set();
      window.finishNavigation = next => { path = next; listeners.forEach(fn => fn()); };
      window.navigationRequests = [];
      const router = { push: url => window.navigationRequests.push(url), back: () => {} };
      export const useRouter = () => router;
      export const usePathname = () => useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => path);
    `)
    writeFileSync(join(temp, 'layout.js'), `export const useIsDesktopLayout = () => ${isDesktop}; export const GLOBAL_NAV_DESKTOP_WIDTH = 64; export const GLOBAL_NAV_MOBILE_HEIGHT = 64;`)
    const bundle = buildSync({
      stdin: {
        contents: `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import { RouteProgressBar } from './src/components/domain/RouteProgressBar';
          import { useProgressRouter } from './src/hooks/useProgressRouter';
          function Harness() {
            const router = useProgressRouter();
            return <><RouteProgressBar /><button onClick={() => router.push('/movie/1')}>현재 상세</button><button onClick={() => router.push('/movie/2')}>다른 상세</button></>;
          }
          createRoot(document.getElementById('root')).render(<Harness />);
        `,
        resolveDir: root,
        loader: 'tsx',
      },
      alias: {
        'next/navigation': join(temp, 'navigation.js'),
        '@/hooks/useIsDesktopLayout': join(temp, 'layout.js'),
        '@/components/navigation/GlobalNav': join(temp, 'layout.js'),
        '@': join(root, 'src'),
      },
      bundle: true, write: false, jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' },
    }).outputFiles[0].text
    const page = await browser.newPage()
    await page.route('http://ui.test/**', route => route.fulfill({ contentType: 'text/html', body: `<style>${readFileSync('src/styles/tokens.css', 'utf8')}</style><div id="root"></div>` }))
    await page.goto('http://ui.test/movie/1')
    await page.addScriptTag({ content: bundle })
    const bar = page.locator('div[aria-hidden][style*="--z-route-progress"]')
    await page.getByRole('button', { name: '현재 상세' }).click()
    expect(await bar.count()).toBe(0)
    await page.getByRole('button', { name: '다른 상세' }).click()
    await bar.waitFor({ state: 'visible' })
    expect(await bar.evaluate((el, side) => getComputedStyle(el)[side], edge)).toBe(expected)
    expect(await bar.count()).toBe(1)
    await page.evaluate(() => (window as unknown as { finishNavigation(path: string): void }).finishNavigation('/movie/2'))
    await bar.waitFor({ state: 'detached' })
    expect(await bar.count()).toBe(0)
  } finally {
    await browser.close()
    rmSync(temp, { recursive: true, force: true })
  }
}, 20000)
