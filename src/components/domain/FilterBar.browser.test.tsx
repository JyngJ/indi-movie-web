import { build } from 'esbuild'
import { chromium } from 'playwright-chromium'
import { expect, it } from 'vitest'

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('영화·감독 칩 본체는 검색을 열고 ×는 해당 필터만 해제한다', async () => {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';import{FilterBar}from'./src/components/domain/FilterBar';
      const hits={movie:0,director:0,clearMovie:0,clearDirector:0};window.hits=hits;
      createRoot(document.getElementById('root')).render(<FilterBar movieFilter={{id:'movie',title:'테스트 영화'}} directorFilter={{name:'테스트 감독'}} onMovieChipClick={()=>hits.movie++} onDirectorChipClick={()=>hits.director++} onMovieFilterClear={()=>hits.clearMovie++} onDirectorFilterClear={()=>hits.clearDirector++}/>);`,
      resolveDir: process.cwd(), loader: 'tsx',
    },
    plugins: [{ name: 'isolate-services', setup(builder) {
      builder.onResolve({ filter: /AuthProvider$|useCurrentLocationRegion$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const useAuth=()=>({status:"anonymous"});export const useCurrentLocationRegion=()=>null;' }))
    } }],
    jsx: 'automatic', bundle: true, write: false,
    loader: { '.css': 'empty', '.module.css': 'empty' },
    platform: 'browser', format: 'iife', tsconfig: 'tsconfig.json',
    define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
  })
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.route('https://fixture.test/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
    await page.goto('https://fixture.test/')
    page.on('pageerror', error => console.error(error.message))
    await page.setContent('<div id="root"></div>')
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    await page.locator('[data-rc="filter-chip-movie"]').click({ timeout: 5000 })
    await page.locator('[data-rc="filter-chip-director"]').click()
    expect(await page.evaluate('window.hits')).toEqual({ movie: 1, director: 1, clearMovie: 0, clearDirector: 0 })
    await page.locator('[data-rc="filter-chip-movie"] [role="button"]').click()
    await page.locator('[data-rc="filter-chip-director"] [role="button"]').click()
    expect(await page.evaluate('window.hits')).toEqual({ movie: 1, director: 1, clearMovie: 1, clearDirector: 1 })
  } finally {
    await browser.close()
  }
}, 20000)
