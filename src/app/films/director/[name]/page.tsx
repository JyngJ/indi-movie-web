import { Suspense } from 'react'
import type { Metadata } from 'next'
import { FilmsDirectorDetailClient } from './FilmsDirectorDetailClient'
import { ogImageUrl } from '@/lib/og/cards'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params
  const directorName = decodeURIComponent(name)
  const title = `${directorName} | 영화볼지도`
  const description = `${directorName} 감독 작품 및 현재 상영 정보`
  const images = [ogImageUrl({ type: 'director', name: directorName })]
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
    alternates: { canonical: `/films/director/${name}` },
  }
}

export default async function FilmsDirectorDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  return (
    <Suspense>
      <FilmsDirectorDetailClient directorName={decodeURIComponent(name)} />
    </Suspense>
  )
}
