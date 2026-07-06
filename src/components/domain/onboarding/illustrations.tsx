// ================================
// Onboarding 일러스트 — 디자인 산출물의 CSS 스켈레톤을 React로 포팅
// 이미지 에셋 없음. 색상은 앱 토큰 + 온보딩 스코프 변수(--ob-*, onboarding.module.css).
// 부모(.illoInner / .mIllo)가 position 기준 컨테이너다.
// ================================

import type { ReactNode } from 'react'
import s from './onboarding.module.css'

/* ── 아이콘 ─────────────────────────────────────────────────────── */

export interface IconProps {
  size?: number
}

function makeIcon(paths: ReactNode, strokeWidth = 1.8) {
  return function Icon({ size = 16 }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {paths}
      </svg>
    )
  }
}

export const IcHistory = makeIcon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 4v4h4" />
    <path d="M12 8v4l3 2" />
  </>,
)
export const IcSparkle = makeIcon(
  <>
    <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4z" />
    <path d="M18.5 15l.7 2.1L21.3 18l-2.1.7L18.5 21l-.7-2.3-2.1-.7 2.1-.9z" />
  </>,
  1.5,
)
export const IcAward = makeIcon(
  <>
    <circle cx="12" cy="9" r="5.2" />
    <path d="M8.5 13.5 7 21l5-2.6L17 21l-1.5-7.5" />
  </>,
)
export const IcPin = makeIcon(
  <>
    <path d="M12 21s-7-4.4-7-11a7 7 0 0 1 14 0c0 6.6-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </>,
)
export const IcSearch = makeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </>,
)
export const IcCal = makeIcon(
  <>
    <rect x="4" y="5" width="16" height="16" rx="2.4" />
    <path d="M4 9.5h16M8 3v4M16 3v4" />
  </>,
)
export const IcLock = makeIcon(
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
  1.7,
)
export const IcArrow = makeIcon(<path d="M5 12h14M13 6l6 6-6 6" />, 2)

/* ── 실제 포스터 (TMDB CDN) ─────────────────────────────────────── */

const TMDB = (path: string) => `https://image.tmdb.org/t/p/w342${path}`

/** 온보딩에 쓰는 실물 포스터 — 널리 알려진 작품으로 첫인상 신뢰 확보 */
export const ONBOARDING_POSTERS = {
  parasite: TMDB('/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg'),
  inception: TMDB('/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg'),
  matrix: TMDB('/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg'),
  odyssey: TMDB('/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg'),
  pulp: TMDB('/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg'),
  fightClub: TMDB('/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'),
} as const

const POSTER_LIST = Object.values(ONBOARDING_POSTERS)

/* ── 빌딩 블록 ──────────────────────────────────────────────────── */

interface PosterProps {
  w: number
  h: number
  src: string
  r?: number
}

/** 실물 포스터 이미지 */
function Poster({ w, h, src, r = 6 }: PosterProps) {
  return (
    <div className={s.poster} style={{ width: w, height: h, borderRadius: r }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={w} height={h} draggable={false} loading="eager" />
    </div>
  )
}

interface PosterPinProps {
  x: number
  y: number
  w: number
  src: string
  name?: string
}

/** 지도 위 떠 있는 포스터 핀 (좌표는 % 단위) — 작은(주변) 핀은 투명도를 낮춰 뒤로 가라앉힘 */
function PosterPin({ x, y, w, src, name }: PosterPinProps) {
  const h = Math.round(w * 1.46)
  const dim = !name
  return (
    <div className={s.ppin} style={{ left: `${x}%`, top: `${y}%`, opacity: dim ? 0.7 : 1 }}>
      {name && <div className={s.namelabel}>{name}</div>}
      <div className={s.pcard}>
        <Poster w={w} h={h} src={src} r={5} />
      </div>
      <div className={s.stem} />
      <div className={s.pdot} />
    </div>
  )
}

/* ── 실제 지도 배경 (CartoDB voyager 타일, 홍대 부근) ────────────── */
// 채도를 낮춰(mapscrim + CSS filter) 배경으로 가라앉히고 포스터 핀을 띄운다.
const TILE_Z = 14
const TILE_CX = 13968 // 홍대입구 중심 타일 (z14)
const TILE_CY = 6345
const TILE_OFFSETS = [-1, 0, 1]
const tileUrl = (x: number, y: number, dark: boolean) =>
  `https://a.basemaps.cartocdn.com/${dark ? 'dark_all' : 'rastertiles/voyager'}/${TILE_Z}/${x}/${y}.png`

function MapBase({ dark = false }: { dark?: boolean }) {
  return (
    <div className={s.mapbg}>
      <div className={s.maptiles}>
        {TILE_OFFSETS.flatMap((dy) =>
          TILE_OFFSETS.map((dx) => {
            const x = TILE_CX + dx
            const y = TILE_CY + dy
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${dx}_${dy}`} src={tileUrl(x, y, dark)} alt="" width={256} height={256} draggable={false} />
            )
          }),
        )}
      </div>
      <div className={s.mapscrim} />
    </div>
  )
}

/* ── Page 1 — 다 모았다: 지도 위 포스터 핀 무리 ─────────────────── */

export function IlloCollected({ dark = false }: { dark?: boolean }) {
  const [p0, p1, p2, p3, p4, p5] = POSTER_LIST
  return (
    <>
      <MapBase dark={dark} />
      <PosterPin x={48} y={30} w={80} src={p0} name="상상마당 홍대" />
      <PosterPin x={20} y={46} w={62} src={p1} />
      <PosterPin x={76} y={52} w={64} src={p2} />
      <PosterPin x={36} y={66} w={58} src={p3} />
      <PosterPin x={64} y={74} w={70} src={p4} name="서울아트시네마" />
      <PosterPin x={88} y={36} w={54} src={p5} />
    </>
  )
}

/* ── Page 2 — 뭘 볼지: 큐레이션 카드 스택 ───────────────────────── */

const REISSUE: Array<[src: string, tag: string]> = [
  [ONBOARDING_POSTERS.parasite, '24년 만의 재상영'],
  [ONBOARDING_POSTERS.matrix, '4K 리마스터'],
  [ONBOARDING_POSTERS.odyssey, '61년 만에'],
  [ONBOARDING_POSTERS.pulp, '재개봉'],
]

const displayFont = { fontFamily: 'var(--font-display)', fontWeight: 700 } as const

export function IlloCuration() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface-raised)' }}>
      <div style={{ position: 'absolute', inset: 0, padding: '40px 0 0 26px', transform: 'rotate(-3deg) scale(1.04)', transformOrigin: 'top left' }}>
        {/* 오랜만에 상영 섹션 카드 */}
        <div style={{ background: 'var(--color-surface-card)', borderRadius: 18, boxShadow: '0 12px 34px rgba(20,15,10,0.12)', padding: '18px 0 20px', width: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px 13px' }}>
            <span style={{ display: 'flex', color: 'var(--color-primary-base)' }}>
              <IcHistory size={18} />
            </span>
            <span style={{ ...displayFont, fontSize: 15.5, color: 'var(--color-text-primary)', letterSpacing: -0.2 }}>
              오랜만에 상영하는 영화
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, overflow: 'hidden', padding: '0 18px' }}>
            {REISSUE.map(([src, tag]) => (
              <div key={tag} style={{ width: 112, flexShrink: 0, position: 'relative' }}>
                <Poster w={112} h={160} src={src} r={8} />
                <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(217,119,6,0.95)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 6px', borderRadius: 5, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                  {tag}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 수상작 랭킹 카드 */}
        <div style={{ marginTop: 16, background: 'var(--color-surface-card)', borderRadius: 18, boxShadow: '0 12px 34px rgba(20,15,10,0.12)', padding: '16px 18px', width: 300, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Poster w={64} h={92} src={ONBOARDING_POSTERS.inception} r={7} />
            <div style={{ ...displayFont, position: 'absolute', top: -7, left: -7, width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary-base)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-surface-card)', boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>
              1
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...displayFont, fontSize: 14.5, color: 'var(--color-text-primary)' }}>인셉션</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
              {['칸 수상', '드라마'].map((tag) => (
                <span key={tag} style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-sub)', background: 'var(--color-surface-raised)', padding: '2px 7px', borderRadius: 4 }}>
                  {tag}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 9, fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 600 }}>
              <IcPin size={12} /> 상영관 6곳
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Page 3 — 어디서: 선택된 핀 클로즈업 + 바텀시트 ─────────────── */

const SHOWTIMES: Array<[time: string, seat: string, warn: boolean]> = [
  ['14:30', '잔여 42', false],
  ['17:00', '잔여 6', true],
  ['20:30', '잔여 51', false],
]

export function IlloMapDetail({ dark = false }: { dark?: boolean }) {
  return (
    <>
      <MapBase dark={dark} />
      <PosterPin x={26} y={42} w={58} src={ONBOARDING_POSTERS.matrix} />
      <PosterPin x={78} y={34} w={54} src={ONBOARDING_POSTERS.pulp} />

      {/* 선택된 핀 클로즈업 */}
      <div style={{ position: 'absolute', left: '50%', top: '30%', transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 6 }}>
        <div className={s.namelabel} style={{ fontSize: 12.5, background: 'var(--color-primary-base)', color: '#fff' }}>
          서울아트시네마
        </div>
        <div style={{ position: 'relative', padding: 5, background: 'var(--color-surface-card)', borderRadius: 9, boxShadow: '0 10px 26px rgba(74,99,128,0.34)', border: '2.5px solid var(--color-primary-base)' }}>
          <Poster w={96} h={138} src={ONBOARDING_POSTERS.parasite} r={6} />
        </div>
        <div style={{ width: 2.5, height: 11, background: 'var(--color-primary-base)' }} />
        <div style={{ width: 15, height: 15, borderRadius: '50%', background: 'var(--color-primary-base)', border: '3px solid var(--color-surface-card)', boxShadow: '0 3px 8px rgba(0,0,0,0.3)' }} />
      </div>

      {/* 바텀시트 미니어처 */}
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 0, background: 'var(--color-surface-bg)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 28px rgba(20,15,10,0.16)', border: '1px solid var(--color-border)', borderBottom: 'none', padding: '9px 18px 20px' }}>
        <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--color-border)', margin: '0 auto 13px' }} />
        <div style={{ ...displayFont, fontSize: 18, color: 'var(--color-text-primary)' }}>서울아트시네마</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 3 }}>종로구 낙원동 · 3호선 종로3가역</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
          {SHOWTIMES.map(([time, seat, warn]) => (
            <div key={time} style={{ flex: 1, background: 'var(--color-surface-card)', border: '1px solid var(--color-border)', borderRadius: 11, padding: '9px 0', textAlign: 'center' }}>
              <div style={{ ...displayFont, fontSize: 16, color: 'var(--color-text-primary)' }}>{time}</div>
              <div style={{ fontSize: 11, color: warn ? 'var(--color-warning)' : 'var(--color-primary-base)', fontWeight: 600, marginTop: 3 }}>
                {seat}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ── Page 4 — 위치: 내 위치 중심으로 극장 핀이 모임 ─────────────── */

const AROUND: Array<[x: number, y: number, w: number, src: string]> = [
  [50, 16, 62, POSTER_LIST[0]],
  [82, 34, 54, POSTER_LIST[1]],
  [84, 66, 50, POSTER_LIST[2]],
  [52, 84, 58, POSTER_LIST[3]],
  [16, 66, 54, POSTER_LIST[4]],
  [16, 32, 50, POSTER_LIST[5]],
]

export function IlloLocation({ dark = false }: { dark?: boolean }) {
  return (
    <>
      <MapBase dark={dark} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(46% 40% at 50% 52%, transparent 0%, transparent 40%, rgba(74,99,128,0.06) 70%)' }} />
      {AROUND.map(([x, y, w, src], i) => (
        <PosterPin key={i} x={x} y={y} w={w} src={src} />
      ))}
      {/* 정확도 링 + 내 위치 마커 */}
      <div style={{ position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%,-50%)', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,99,128,0.18) 0%, rgba(74,99,128,0.05) 55%, transparent 70%)', border: '1.5px solid rgba(74,99,128,0.3)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%,-50%)', width: 22, height: 22, borderRadius: '50%', background: 'var(--color-primary-base)', border: '3.5px solid #fff', boxShadow: '0 3px 12px rgba(74,99,128,0.5)' }} />
    </>
  )
}
