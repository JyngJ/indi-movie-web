async function run() {
  const origin = 'https://wd.moviee.co.kr'
  const headers = {
    'user-agent': 'Mozilla/5.0 (compatible; indi-movie-web-admin-crawler/0.1)',
    accept: 'application/json, text/javascript, */*; q=0.01',
    'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'x-requested-with': 'XMLHttpRequest',
    referer: `${origin}/Theater/Index`,
  }
  const playDate = '2026-07-08'
  const timeParams = `tid=&play_dt=${playDate}` // createMovieeTimeParams returns this roughly
  const res2 = await fetch(`${origin}/api/TicketApi/GetPlayTimeList?${timeParams}`, { headers })
  const text2 = await res2.text()
  console.log(text2.slice(0, 500))
}
run()
