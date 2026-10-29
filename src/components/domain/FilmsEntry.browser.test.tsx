import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { chromium } from 'playwright-chromium'
import { expect, it } from 'vitest'

const movies = [1, 2, 3].map(id => ({ id: String(id), title: `영화 ${id}`, year: 1995, genre: ['드라마'], director: [`감독 ${id}`], posterUrl: `https://posters.test/${id}.png` }))

async function bundle(pageFixture: boolean) {
  return build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';
      import FilmsPage from './src/app/(tabs)/FilmsClient';import{CurationSectionRow}from'./src/components/domain/CurationSectionRow';
      const root=createRoot(document.getElementById('root'));window.draw=()=>root.render(${pageFixture ? '<FilmsPage/>' : '<CurationSectionRow title="포스터 행" movies={window.movies} onMovieClick={id=>window.clicked=id}/>'});window.draw();`,
      resolveDir: process.cwd(), loader: 'tsx',
    },
    jsx: 'automatic', bundle: true, write: false, platform: 'browser', format: 'iife', tsconfig: 'tsconfig.json',
    loader: { '.css': 'empty', '.module.css': 'empty' },
    define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'films-fixture', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        if (args.path === 'next/navigation') return { path: 'navigation', namespace: 'fixture' }
        if (args.path === 'next/image') return { path: 'image', namespace: 'fixture' }
        if (/useSectionDwellTracking$|analytics\/client$/.test(args.path)) return { path: 'tracking', namespace: 'fixture' }
        if (!pageFixture) return
        if (args.path.endsWith('supabase/queries')) return { path: 'queries', namespace: 'fixture' }
        if (args.path.endsWith('useCurationData')) return { path: 'curation', namespace: 'fixture' }
        if (/useLocationPermission$|useCurrentLocationRegion$|useFirstUseHint$/.test(args.path)) return { path: 'hooks', namespace: 'fixture' }
        // 페이지의 로딩 전환은 실제 구현으로, 하위 섹션은 표시 순서만 검증한다.
        if (args.importer.endsWith('FilmsClient.tsx') && args.path.includes('/components/') && !args.path.endsWith('CurationSectionRow')) return { path: args.path, namespace: 'sections' }
      })
      builder.onLoad({ filter: /.*/, namespace: 'sections' }, args => {
        if (args.path.endsWith('/primitives')) return { resolveDir: process.cwd(), loader: 'tsx', contents: `export const SectionHeader=({title})=><h2>{title}</h2>;export const MovieCardSkeleton=()=> <div style={{height:180}}>준비 중</div>;export const FabRound=()=>null;export const Icon=()=>null;export const Divider=()=>null;export const LoadingStatus=({message})=><div role="status">{message}</div>;` }
        const name = args.path.split('/').pop()!
        const names: Record<string, string> = { GlobalNav: 'GLOBAL_NAV_DESKTOP_WIDTH', RouteProgressBar: 'navStart', HintBubble: 'HintBubble', FilterChip: 'FilterChip' }
        const symbol = names[name] ?? name
        const contents = symbol === 'GLOBAL_NAV_DESKTOP_WIDTH' ? 'export const GLOBAL_NAV_DESKTOP_WIDTH=80;'
          : symbol === 'AllMoviesGrid' ? 'export const ALL_MOVIES_GRID_ANCHOR_ID="all-movies-grid";export const AllMoviesGrid=()=> <div id="all-movies-grid">전체 영화</div>;'
          : symbol === 'CurationSectionRow' ? 'export const CurationSectionRow=({title,id,movies})=><section id={id}><h2>{title}</h2>{movies.map(m=><div key={m.id}>{m.title}</div>)}</section>;'
          : symbol === 'AllMoviesCtaBand' ? 'export const AllMoviesCtaBand=()=> <div data-grid-cta>전체 상영작</div>;'
          : `export const ${symbol}=()=>null;`
        return { contents, loader: 'tsx', resolveDir: process.cwd() }
      })
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: process.cwd(), loader: 'tsx', contents: {
        navigation: 'export const useRouter=()=>({push:()=>{}});',
        image: 'export default function Image(props){return <img {...props}/>}',
        tracking: 'export const useSectionDwellTracking=()=>{};export const trackEvent=()=>{};',
        hooks: 'export const useLocationPermission=()=>({coords:null});export const useCurrentLocationRegion=()=>null;export const useFirstUseHint=()=>({state:"done",dismiss:()=>{}});',
        queries: `const q=(data,key)=>({data,isLoading:window.pending.includes(key),isFetching:window.refreshing});
          export const useMovies=()=>q(window.movies,'movies');export const useTheaters=()=>q([],'theaters');
          export const useCurationLists=()=>q([{listId:'decade_90s',nameKo:'90년대 영화',type:'dynamic',query:{yearRange:[1990,1999]},minN:3}],'lists');
          export const useActiveMovieIdsByRegion=()=>q(['1','2','3'],'active');export const useActiveMovieTheaterPairs=()=>q([],'pairs');
          export const useClickRankings=()=>q(window.pending.includes('ranking')?undefined:window.ranking,'ranking');
          export const useFilmRankings=()=>q(null,'unused');export const useFestivals=()=>q([],'festivals');export const useInstagramRecommendations=()=>q([],'unused');
          export const useAlmostSoldOutCandidates=()=>q([],'seats');export const useLateNightCandidates=()=>q([],'weekend');`,
        curation: 'export const useCurationData=()=>({isLoading:window.pending.includes("curation"),lastWeekFilms:[],newIndieFilms:[],returningFilms:[],recentlyViewed:[],soloTheaterFilms:[],todayShowFilms:[]});',
      }[args.path]! }))
    } }],
  })
}

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1').each([390, 1280])('폭 %ipx에서 늦은 랭킹 자리를 유지하고 배경 재조회 때 본문이 깜빡이지 않는다', async (width) => {
  const output = await bundle(true)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.route('http://films.test/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
    await page.goto('http://films.test')
    await page.evaluate(movies => {
      Object.assign(window, { movies, pending: ['ranking'], ranking: { booking: movies.map(m => ({ movieId: m.id, count: 10 })), views: [] } })
    }, movies)
    await page.addStyleTag({ content: readFileSync('src/styles/tokens.css', 'utf8') + '.flex{display:flex}.shrink-0{flex-shrink:0}.grow-0{flex-grow:0}.overflow-hidden{overflow:hidden}.relative{position:relative}*{box-sizing:border-box}body{margin:0}.display-h2{font-size:20px;line-height:1.3}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden}span{line-height:1.3}' })
    await page.addScriptTag({ content: output.outputFiles[0].text })
    const rank = page.getByRole('heading', { name: '지금 가장 많이 찾는 영화' })
    const lower = page.getByRole('heading', { name: '90년대 영화' })
    await rank.waitFor({ timeout: 3000 })
    await lower.waitFor()
    await page.locator('section[aria-busy="true"]').first().waitFor()
    await page.locator('#decade_90s').waitFor()
    const beforeLower = await lower.boundingBox()
    await page.evaluate('window.pending=[];window.draw()')
    await expect.poll(() => page.locator('section[aria-busy="true"]').count()).toBe(0)
    expect(await lower.boundingBox()).toEqual(beforeLower)
    const headings = await page.getByRole('heading').allTextContents()
    expect(headings.indexOf('지금 가장 많이 찾는 영화')).toBeLessThan(headings.indexOf('90년대 영화'))
    const before = await rank.boundingBox()
    await page.evaluate('window.refreshing=true;window.draw()')
    expect(await page.getByRole('status').count()).toBe(0)
    expect(await rank.boundingBox()).toEqual(before)
    // 랭킹 조회 실패는 빈 확정 결과로 처리해 나머지 본문을 보여 준다.
    await page.evaluate('window.ranking=undefined;window.draw()')
    await expect.poll(() => rank.count()).toBe(0)
    expect(await page.getByRole('heading', { name: '90년대 영화' }).count()).toBe(1)
    expect(errors).toEqual([])
  } finally { await browser.close() }
}, 30000)

it.skipIf(process.env.RUN_BROWSER_TESTS !== '1')('느린 포스터도 카드 행은 함께 이동 없이 나타나고 이미지 로드 후에도 클릭할 수 있다', async () => {
  const output = await bundle(false)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
    let release!: () => void
    const slow = new Promise<void>(resolve => { release = resolve })
    await page.route('https://posters.test/**', async route => {
      if (route.request().url().endsWith('2.png')) await slow
      await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180"><rect width="120" height="180" fill="tan"/></svg>' })
    })
    await page.route('http://films.test/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
    await page.goto('http://films.test')
    await page.addStyleTag({ content: readFileSync('src/styles/tokens.css', 'utf8') + '.flex{display:flex}.shrink-0{flex-shrink:0}.grow-0{flex-grow:0}.overflow-hidden{overflow:hidden}.relative{position:relative}body{margin:0}' })
    await page.evaluate(movies => Object.assign(window, { movies }), movies)
    await page.addScriptTag({ content: output.outputFiles[0].text })
    const cards = page.getByText(/^영화 [1-3]$/).locator('../..')
    await expect.poll(() => cards.count()).toBe(3)
    await expect.poll(() => cards.first().evaluate(el => {
      let opacity = 1
      for (let node: Element | null = el; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity)
      return opacity
    })).toBe(1)
    const styles = await cards.evaluateAll(nodes => nodes.map(el => ({ transform: getComputedStyle(el).transform, opacity: getComputedStyle(el).opacity })))
    expect(styles).toEqual(Array.from({ length: 3 }, () => ({ transform: 'none', opacity: '1' })))
    expect(await page.getByText('영화 2', { exact: true }).isVisible()).toBe(true)
    expect(await page.getByAltText('영화 2', { exact: true }).evaluate(el => getComputedStyle(el).opacity)).toBe('0')
    release()
    await expect.poll(() => page.getByAltText('영화 2', { exact: true }).evaluate(el => getComputedStyle(el).opacity)).toBe('1')
    await page.getByText('영화 2', { exact: true }).click()
    expect(await page.evaluate('window.clicked')).toBe('2')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByText('영화 3', { exact: true }).click()
    expect(await page.evaluate('window.clicked')).toBe('3')
  } finally { await browser.close() }
}, 30000)
