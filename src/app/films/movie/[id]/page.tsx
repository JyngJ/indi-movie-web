import { permanentRedirect } from 'next/navigation'

/** 기존 공유 링크의 날짜·극장·회차와 반복 쿼리 값을 보존한다. */
export default async function FilmsMovieDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => search.append(key, item))
    else if (value !== undefined) search.append(key, value)
  }
  const suffix = search.size ? `?${search}` : ''
  permanentRedirect(`/movie/${encodeURIComponent(id)}${suffix}`)
}
