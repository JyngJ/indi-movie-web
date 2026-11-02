import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'

/** 실제 시트·제스처와 격리한 조회 응답을 결합하는 브라우저 검증 화면. */
export async function buildTheaterHardenFixture(before = false, fullStyles = false) {
  const bundle = await build({
    stdin: {
      resolveDir: process.cwd(), loader: 'tsx',
      contents: `import React,{useState,useRef}from'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{TheaterSheet}from'./src/components/domain/TheaterSheet';import{useDragSheet}from'./src/hooks/useDragSheet';
      const client=new QueryClient({defaultOptions:{queries:{retry:false}}});window.fixture={client,hits:{close:0,collapse:0,expand:0},events:[]};for(const type of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture','blur'])window.addEventListener(type,e=>{window.fixture.events.push({type,id:e.pointerId,trusted:e.isTrusted,dragging:document.querySelector('#gesture')?.getAttribute('data-dragging')});if(type==='pointerdown'&&e.isTrusted)window.fixture.pointerId=e.pointerId},true);
      function Drag(){const enterDone=useRef(true),scrollAreaRef=useRef(null),posterTouching=useRef(false),posterDrag=useRef({active:false,startX:0,scrollLeft:0});const[closed,close]=useState(false);const h=useDragSheet({viewportHeight:844,shownExpanded:true,panelMode:false,exiting:false,enterDone,scrollAreaRef,posterTouching,posterDrag,collapsedHeight:478,onClose:()=>{window.fixture.hits.close++;close(true)},onCollapse:()=>window.fixture.hits.collapse++,onExpand:()=>window.fixture.hits.expand++});return <div id="gesture" data-dragging={h.dragging} onPointerDown={h.handlePointerDown} onPointerMove={h.handlePointerMove} onPointerUp={h.handlePointerUp} onPointerCancel={h.handlePointerCancel??h.handlePointerUp} onLostPointerCapture={h.handlePointerCancel} style={{padding:24,height:400,touchAction:'none',background:'var(--color-surface-card)',transform:'translateY('+h.finalTranslate+'px)'}}><h2>드래그 취소 확인</h2><p>{closed?'시트가 닫혔어요':'시트를 계속 볼 수 있어요'}</p><p>이동 중 제스처가 취소돼도 원래 자리로 돌아와야 해요</p></div>}
      function App(){const[movie,setMovie]=useState('movie'),[closed,setClosed]=useState(false);return location.pathname.includes('gesture')?<Drag/>:closed?<p style={{padding:24}}>극장 시트가 닫혔어요</p>:<QueryClientProvider client={client}><TheaterSheet theater={{id:'theater',name:'검증용 극장',address:'예시 상영 정보 · 실제 예매 아님',city:'서울',lat:37.5,lng:127}} expanded presentation={location.search.includes('sheet=1')?'sheet':'dock'} selectedMovieId={movie} onMovieSelect={setMovie} onClose={()=>{window.fixture.hits.close++;setClosed(true)}} onCollapse={()=>{}} onExpand={()=>{}}/></QueryClientProvider>};createRoot(document.getElementById('root')).render(<App/>);`,
    },
    plugins: [{ name: 'theater-fixture', setup(builder) {
      builder.onResolve({ filter: /supabase\/queries$|useFavorites$|usePendingNavItem$|GvEventSection$|GvDetailPanel$/ }, args => ({ path: args.path.split('/').pop()!, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'tsx', resolveDir: process.cwd(), contents: {
        queries: `import{useQuery}from'@tanstack/react-query';export const useTheaterShowtimes=(id,date)=>useQuery({queryKey:['theater-showtimes',id,date],queryFn:async()=>{const r=await fetch('/fixture/showtimes?date='+date);if(!r.ok)throw Error('fixture failure');return r.json()}});export const useTheaterAllMovies=id=>useQuery({queryKey:['theater-all-movies',id],queryFn:async()=>{const r=await fetch('/fixture/movies');if(!r.ok)throw Error('fixture failure');return(await r.json()).map(x=>({...x,availableDates:new Set(x.availableDates)}))}});`,
        useFavorites: 'export const useFavorites=()=>({isFavorite:()=>false,toggle:()=>{}});',
        usePendingNavItem: 'export const usePendingNavItem=()=>({pendingId:null,navigate:()=>{}});',
        GvEventSection: 'export const GvEventSection=()=>null;',
        GvDetailPanel: 'export const GvDetailPanel=()=>null;',
      }[args.path]! }))
      if (before) builder.onLoad({ filter: /src\/(hooks\/useDragSheet|components\/domain\/TheaterSheet)\.tsx?$/ }, args => ({
        loader: 'tsx', resolveDir: args.path.slice(0, args.path.lastIndexOf('/')),
        contents: execFileSync('git', ['show', '5127b976:' + args.path.slice(process.cwd().length + 1)], { encoding: 'utf8' }),
      }))
    } }],
    bundle: true, write: false, jsx: 'automatic', platform: 'browser', format: 'iife', tsconfig: 'tsconfig.json',
    loader: { '.css': 'empty', '.module.css': 'empty' }, define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
  })
  const tokens = readFileSync('src/styles/tokens.css', 'utf8')
  let styles = tokens
  if (fullStyles) {
    const postcss = (await import('postcss')).default
    const tailwind = (await import('@tailwindcss/postcss')).default
    styles = (await postcss([tailwind()]).process(readFileSync('src/app/globals.css', 'utf8'), { from: 'src/app/globals.css' })).css
  }
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>극장 시트 검증 · ${before ? '수정 전' : '수정 후'}</title><style>${styles}
  *{box-sizing:border-box}body{margin:0;background:var(--color-surface-bg);font-family:system-ui,sans-serif;color:var(--color-text-primary)}button,a{font:inherit;cursor:pointer}button{border-style:solid}button:disabled{cursor:wait}.inline-flex{display:inline-flex;align-items:center;justify-content:center}.flex{display:flex}.flex-col{flex-direction:column}.items-center{align-items:center}.justify-center{justify-content:center}.gap-1{gap:4px}.display-h1{font-size:var(--text-h1);font-weight:700}.display-h2{font-size:var(--text-h2);font-weight:700}#root{height:100dvh;max-width:480px;margin:auto;overflow:auto}h2{font-size:var(--text-h2)}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script></html>`
}

export function fixtureMovies(date: string) {
  return [{ movie: { id: 'movie', title: '검증용 영화', year: 2026, director: [], genre: [], nation: '한국', runtimeMinutes: 95 }, availableDates: [date] }]
}

export function fixtureShowtimes(date: string) {
  return { movies: [], showtimes: [{ id: 'showtime', theaterId: 'theater', movieId: 'movie', movieTitle: '검증용 영화', showDate: date, showTime: '19:30', endTime: '21:05', seatAvailable: 42, seatTotal: 80 }] }
}
