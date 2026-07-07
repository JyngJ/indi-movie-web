

async function run() {
  const url = 'https://www.cineq.co.kr/Theater/MovieTable2'
  const theaterCode = '1001' // Sindorim
  const playDate = '2026-07-07' // Today
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `TheaterCode=${theaterCode}&PlayDate=${playDate}`
  })
  
  const html = await res.text()
  console.log(html.slice(0, 1000))
  console.log('HTML length:', html.length)
  console.log('Has each-movie-time:', html.includes('each-movie-time'))
}
run().catch(console.error)
