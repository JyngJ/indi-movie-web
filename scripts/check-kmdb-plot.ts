async function main() {
  const url = new URL('https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp')
  url.searchParams.set('collection', 'kmdb_new2')
  url.searchParams.set('ServiceKey', process.env.KMDB_SERVICE_KEY!)
  url.searchParams.set('movieId', 'F')
  url.searchParams.set('movieSeq', '06365')
  url.searchParams.set('detail', 'Y')

  const res = await fetch(url)
  const json = await res.json() as { Data?: Array<{ Result?: Array<Record<string, unknown>> }> }
  const item = json.Data?.[0]?.Result?.[0]
  if (!item) { console.log('결과 없음'); return }

  console.log('plot:', JSON.stringify(item.plot))
  console.log('plots:', JSON.stringify(item.plots))
  console.log('synopsis:', JSON.stringify(item.synopsis))
}
main().catch(console.error)
