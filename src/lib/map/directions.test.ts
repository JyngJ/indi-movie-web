import { describe, expect, it } from 'vitest'
import { naverDirectionsUrls } from './directions'

describe('naverDirectionsUrls', () => {
  it('앱 스킴에 목적지 좌표와 이름을, 웹 주소에 경도·위도 순서로 좌표를 싣는다', () => {
    const urls = naverDirectionsUrls({ name: '영화의전당', lat: 35.171, lng: 129.127 })
    expect(urls.app).toBe('nmap://route/public?dlat=35.171&dlng=129.127&dname=%EC%98%81%ED%99%94%EC%9D%98%EC%A0%84%EB%8B%B9&appname=kr.indi.movie')
    expect(urls.web).toBe('https://map.naver.com/v5/directions/-/-/-/transit?c=129.127,35.171,15,0,0,0,dh')
  })
})
