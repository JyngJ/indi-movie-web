async function run() {
  const cinemaId = 75 // 동두천문화극장
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yyyy = tomorrow.getFullYear()
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const dd = String(tomorrow.getDate()).padStart(2, '0')
  const dateStr = `${yyyy}${mm}${dd}`
  
  const resp = await fetch('https://petitecine.com/api/W0060.do', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'indi-movie-web-admin-crawler/0.1' },
    body: JSON.stringify({ req_cmd: 'selectlist', cinema_id: Number(cinemaId), chkCinemaId: 'N', movie_date: dateStr })
  })
  const text = await resp.json()
  console.log(text.data[0])
}
run()
