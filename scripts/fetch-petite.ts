async function run() {
  const cinemaId = 75
  const d = new Date()
  const today = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-')
  
  const res = await fetch(`https://petitecine.com/PETC/ticketing/get_movie_time_list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `cinema_id=${cinemaId}&search_date=${today}`
  })
  const text = await res.text()
  console.log(text.slice(0, 500))
}
run()
