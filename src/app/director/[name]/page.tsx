import { DirectorDetailClient } from './DirectorDetailClient'

export default async function DirectorDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  return <DirectorDetailClient directorName={decodeURIComponent(name)} />
}
