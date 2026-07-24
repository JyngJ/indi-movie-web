import { Suspense } from 'react'
import type { Metadata } from 'next'
import { DirectorDetailClient } from './DirectorDetailClient'

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params
  const directorName = decodeURIComponent(name)
  return {
    title: `${directorName} | 영화볼지도`,
    description: `${directorName} 감독 작품 및 현재 상영 정보`,
    alternates: { canonical: `/films/director/${name}` },
  }
}

export default async function DirectorDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  return (
    <Suspense>
      <DirectorDetailClient directorName={decodeURIComponent(name)} />
    </Suspense>
  )
}
