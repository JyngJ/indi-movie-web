'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FavoriteToggle } from '@/components/domain/favorites/FavoriteToggle'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { Button, FilterPill } from '@/components/primitives'
import { useDetailLink } from '@/hooks/useDetailLink'
import { useFavorites } from '@/hooks/useFavorites'
import { favoriteKey, type Favorite } from '@/lib/favorites/types'
import { summarizeFavorites } from '@/lib/favorites/summarize'
import { useActiveMovieTheaterPairs, useMovies, useTheaters } from '@/lib/supabase/queries'

type Tab = 'movie' | 'theater' | 'director'

/**
 * 관심 목록 본문 (IA 30) — 영화 / 극장 / 감독 탭. 상영 중이면 배지, 없으면 dim.
 * 모바일 /my/favorites 페이지와 데스크톱 MY 팝오버가 공유한다.
 * onNavigate: 팝오버에서 링크를 눌렀을 때 팝오버를 닫는 훅.
 *
 * 하트를 꺼도 카드가 즉시 사라지지 않는다 — 잘못 눌렀을 때 되돌릴 자리가 없어지기 때문.
 * 빈 하트 상태로 남아 있다가, 화면을 벗어났다 다시 들어오면 그때 목록에서 빠진다.
 */
export function FavoritesContent({ onNavigate }: { onNavigate?: () => void }) {
  const [tab, setTab] = useState<Tab>('movie')
  const linkProps = useDetailLink(onNavigate)

  const { favorites, isLoading } = useFavorites()
  const { data: movies = [] } = useMovies()
  const { data: theaters = [] } = useTheaters()
  const { data: pairs = [] } = useActiveMovieTheaterPairs(null)

  /* 이 화면에 한 번 뜬 항목은 하트를 꺼도 계속 그린다(해제 취소 여지).
     추가는 즉시 반영, 삭제만 화면을 벗어날 때까지 보류 — 컴포넌트가 언마운트되면 초기화된다. */
  const [visible, setVisible] = useState<Favorite[]>([])
  const seenRef = useRef(new Set<string>())
  useEffect(() => {
    setVisible((prev) => {
      const added = favorites.filter((f) => !seenRef.current.has(favoriteKey(f.type, f.id)))
      if (added.length === 0) return prev
      for (const f of added) seenRef.current.add(favoriteKey(f.type, f.id))
      return [...prev, ...added]
    })
  }, [favorites])

  const summary = useMemo(() => summarizeFavorites(visible, movies, theaters, pairs), [visible, movies, theaters, pairs])
  const list = tab === 'movie' ? summary.movies : tab === 'theater' ? summary.theaters : summary.directors
  // favorites가 이미 있는데 visible이 아직 안 찬 첫 렌더에서 빈 상태가 깜빡이지 않게 한다
  const empty = !isLoading && favorites.length === 0 && list.length === 0

  return (
    <>
    <div role="tablist" aria-label="관심 종류" style={{ display: 'flex', gap: 8, padding: '12px var(--gutter)' }}>
      <FilterPill active={tab === 'movie'} onClick={() => setTab('movie')} role="tab" aria-selected={tab === 'movie'}>
        영화 {summary.movies.length > 0 ? summary.movies.length : ''}
      </FilterPill>
      <FilterPill active={tab === 'theater'} onClick={() => setTab('theater')} role="tab" aria-selected={tab === 'theater'}>
        극장 {summary.theaters.length > 0 ? summary.theaters.length : ''}
      </FilterPill>
      <FilterPill active={tab === 'director'} onClick={() => setTab('director')} role="tab" aria-selected={tab === 'director'}>
        감독 {summary.directors.length > 0 ? summary.directors.length : ''}
      </FilterPill>
    </div>

    {empty && (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px var(--gutter)', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
          {tab === 'movie'
            ? '하트를 눌러 관심 영화를 모아보세요.\n새로 상영하는 곳이 생기면 알려드려요.'
            : tab === 'theater'
              ? '하트를 눌러 관심 극장을 모아보세요.\n새 상영작 소식을 알려드려요.'
              : '감독 페이지에서 하트를 눌러 모아보세요.\n이 감독 영화가 상영되면 알려드려요.'}
        </p>
        <Link href={tab === 'theater' ? '/map' : '/'} onClick={onNavigate} style={{ textDecoration: 'none' }}>
          <Button variant="secondary" size="md">{tab === 'theater' ? '지도에서 극장 찾기' : '상영작 둘러보기'}</Button>
        </Link>
      </div>
    )}

    {tab === 'movie' && summary.movies.length > 0 && (
      <ul style={{ listStyle: 'none', margin: 0, padding: '0 var(--gutter)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 16 }}>
        {summary.movies.map((m) => {
          const active = m.screeningTheaterCount > 0
          return (
            <li key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', opacity: active ? 1 : 0.55 }}>
              <Link {...linkProps({ kind: 'movie', id: m.id })} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PosterThumb src={m.posterUrl} alt={`${m.title} 포스터`} width={104} height={156} size="lg" />
                <span style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                <span style={{ fontSize: 'var(--text-meta)', color: active ? 'var(--color-success)' : 'var(--color-text-caption)' }}>
                  {active ? `상영 중 · ${m.screeningTheaterCount}개 극장` : '상영 소식 기다리는 중'}
                </span>
              </Link>
              <div style={{ position: 'absolute', top: 4, right: 4 }}>
                <FavoriteToggle type="movie" id={m.id} label={m.title} variant="overlay" size={32} />
              </div>
            </li>
          )
        })}
      </ul>
    )}

    {tab === 'theater' && summary.theaters.length > 0 && (
      <ul style={{ listStyle: 'none', margin: '0 var(--gutter)', padding: 0, borderRadius: 'var(--radius-control)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {summary.theaters.map((t, i) => {
          const active = t.screeningMovieCount > 0
          return (
            <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px var(--gutter)', backgroundColor: 'var(--color-surface-card)', borderBottom: i < summary.theaters.length - 1 ? '1px solid var(--color-border)' : 'none', opacity: active ? 1 : 0.6 }}>
              <Link {...linkProps({ kind: 'theater', id: t.id })} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
                  {t.city} · {active ? `상영 중 ${t.screeningMovieCount}편` : '상영 정보 없음'}
                </span>
              </Link>
              <FavoriteToggle type="theater" id={t.id} label={t.name} size={32} />
            </li>
          )
        })}
      </ul>
    )}

    {tab === 'director' && summary.directors.length > 0 && (
      <ul style={{ listStyle: 'none', margin: '0 var(--gutter)', padding: 0, borderRadius: 'var(--radius-control)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {summary.directors.map((d, i) => {
          const active = d.screeningMovieCount > 0
          return (
            <li key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px var(--gutter)', backgroundColor: 'var(--color-surface-card)', borderBottom: i < summary.directors.length - 1 ? '1px solid var(--color-border)' : 'none', opacity: active ? 1 : 0.6 }}>
              <Link {...linkProps({ kind: 'director', name: d.name })} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                <span style={{ fontSize: 'var(--text-meta)', color: active ? 'var(--color-success)' : 'var(--color-text-caption)' }}>
                  {active ? `상영 중 ${d.screeningMovieCount}편` : d.movieCount > 0 ? `등록 ${d.movieCount}편 · 상영 없음` : '상영 소식 기다리는 중'}
                </span>
              </Link>
              <FavoriteToggle type="director" id={d.name} label={`${d.name} 감독`} size={32} />
            </li>
          )
        })}
      </ul>
    )}
    </>
  )
}
