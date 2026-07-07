async function run() {
  const cgid = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'
  const brand = 'scinema'
  const cinemaCd = '000024'
  
  const res = await fetch(`https://www.dtryx.com/cinema/info.do?cgid=${cgid}&BrandCd=${brand}&CinemaCd=${cinemaCd}`)
  const html = await res.text()
  
  console.log(html.slice(0, 1000))
  const match = html.match(/[\s\S]{0,100}주소[\s\S]{0,100}/)
  console.log('Match:', match ? match[0] : 'None')
}
run()
