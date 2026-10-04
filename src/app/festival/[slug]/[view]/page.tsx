import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { toFestivalSchema } from '@/lib/seo/toFestivalSchema'
import { toBreadcrumbSchema } from '@/lib/seo/toBreadcrumbSchema'
import { dateWithDow, festivalViewMetaDescription, festivalViewSeoTitle } from '@/lib/seo/festivalSeo'
import { festivalViewPath, parseFestivalView, selectViewScreenings } from '@/lib/festival/festivalView'
import { FestivalViewSeoContent } from '@/components/seo/FestivalViewSeoContent'
import { FestivalDetailClient } from '../FestivalDetailClient'
import { fetchFestival } from '../fetchFestival'

/* 영화제 하위 페이지 — 날짜별 시간표(/festival/biff31/2026-10-08) · GV 일정(/festival/biff31/gv).
   "부국제 10월 8일 시간표", "부국제 GV 일정"처럼 구체적인 검색어에 걸릴 주소를 따로 둔다.
   화면은 상세와 같고, 시간표가 그 날짜(또는 GV 회차)로 열린다. */

export const revalidate = 3600

// 상세와 같은 이유(ISR이 걸리게) — 조각은 날짜·gv라 캐시 태그 한글 문제와 무관하다
export function generateStaticParams() {
  return []
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'

type Params = Promise<{ slug: string; view: string }>

async function resolve(params: Params) {
  const { slug, view: segment } = await params
  const festival = await fetchFestival(slug)
  if (!festival) return null
  const view = parseFestivalView(segment, festival.screenings)
  if (!view) return null
  return { festival, view, screenings: selectViewScreenings(festival.screenings, view) }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const resolved = await resolve(params)
  if (!resolved) return { title: '영화볼지도' }
  const { festival, view, screenings } = resolved

  const title = `${festivalViewSeoTitle(festival, view, screenings)} | 영화볼지도`
  const description = festivalViewMetaDescription(festival, view, screenings)
  const path = festivalViewPath(festival.slug, view)
  const ogImage = festival.bannerUrl ?? festival.posterUrl
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: ogImage
      ? { title, description, url: path, images: [{ url: ogImage }] }
      : { title, description, url: path },
    twitter: ogImage ? { title, description, images: [ogImage] } : { title, description },
  }
}

export default async function FestivalViewPage({ params }: { params: Params }) {
  const resolved = await resolve(params)
  if (!resolved) notFound()
  const { festival, view, screenings } = resolved

  const festivalSchema = toFestivalSchema(festival, BASE_URL)
  const breadcrumbSchema = toBreadcrumbSchema(
    [
      { name: '영화볼지도', path: '/' },
      { name: '영화제', path: '/films' },
      { name: festival.name, path: `/festival/${festival.slug}` },
      { name: view.kind === 'gv' ? 'GV 일정' : `${dateWithDow(view.date)} 상영 시간표` },
    ],
    BASE_URL,
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(festivalSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <FestivalViewSeoContent festival={festival} view={view} screenings={screenings} />
      <Suspense>
        <FestivalDetailClient festival={festival} view={view} />
      </Suspense>
    </>
  )
}
