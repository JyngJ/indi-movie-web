import { describe, it, expect } from 'vitest'
import { licensedImageUrl, toSecureImageUrl } from './imageUrl'

describe('toSecureImageUrl', () => {
  it('http 포스터를 https로 올린다', () => {
    expect(toSecureImageUrl('http://file.koreafilm.or.kr/thm/02/99/19/03/tn_DPF031411.jpg'))
      .toBe('https://file.koreafilm.or.kr/thm/02/99/19/03/tn_DPF031411.jpg')
  })

  it('이미 https면 그대로 둔다', () => {
    const url = 'https://file.koreafilm.or.kr/a.jpg'
    expect(toSecureImageUrl(url)).toBe(url)
  })

  it('경로 안의 http는 건드리지 않는다', () => {
    const url = 'https://img.example.com/proxy?u=http://origin/a.jpg'
    expect(toSecureImageUrl(url)).toBe(url)
  })

  it('상대 경로·데이터 URL은 그대로', () => {
    expect(toSecureImageUrl('/illust/no-showtimes.png')).toBe('/illust/no-showtimes.png')
    expect(toSecureImageUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA')
  })

  it('빈 값은 undefined', () => {
    expect(toSecureImageUrl(undefined)).toBeUndefined()
    expect(toSecureImageUrl(null)).toBeUndefined()
    expect(toSecureImageUrl('')).toBeUndefined()
  })
})

describe('licensedImageUrl', () => {
  it('허용 호스트는 https로 올려 돌려준다', () => {
    expect(licensedImageUrl('http://file.koreafilm.or.kr/thm/a.jpg')).toBe('https://file.koreafilm.or.kr/thm/a.jpg')
    expect(licensedImageUrl('https://upload.wikimedia.org/x.png')).toBe('https://upload.wikimedia.org/x.png')
  })
  it('언론사·그 밖의 호스트와 잘못된 값은 null', () => {
    expect(licensedImageUrl('https://image.cine21.com/cine21/poster/a.jpg')).toBeNull()
    expect(licensedImageUrl('javascript:alert(1)')).toBeNull()
    expect(licensedImageUrl('not a url')).toBeNull()
    expect(licensedImageUrl(null)).toBeNull()
  })
})
