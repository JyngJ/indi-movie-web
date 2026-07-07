async function run() {
  const cgid = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'
  const brand = 'scinema'
  const cinemaCd = '000024'
  
  const res = await fetch(`https://www.dtryx.com/cinema/main.do?cgid=${cgid}&BrandCd=${brand}&CinemaCd=${cinemaCd}`)
  const html = await res.text()
  
  const match = html.match(/<dt>주소<\/dt>\s*<dd>([^<]+)<\/dd>/) || html.match(/class="address"[^>]*>([^<]+)<\//) || html.match(/주소[^>]*>([^<]+)<\//)
  const address = match ? match[1].trim() : 'NOT_FOUND'
  console.log('Address:', address)
}
run()
