import { describe, expect, it } from 'vitest'
import { normalizeSynopsis } from './normalizeSynopsis'

describe('normalizeSynopsis', () => {
  it('물음표 뒤에 붙은 한글을 띄운다', () => {
    expect(normalizeSynopsis('대체 무엇인가?낯설지만 익숙한 세계')).toBe(
      '대체 무엇인가? 낯설지만 익숙한 세계',
    )
  })

  it('마침표·느낌표 뒤 문장도 띄운다', () => {
    expect(normalizeSynopsis('일상이 깨졌다.다시 반복된 과거')).toBe('일상이 깨졌다. 다시 반복된 과거')
    expect(normalizeSynopsis('청춘, 시작!학교에서도')).toBe('청춘, 시작! 학교에서도')
  })

  it('말줄임표와 가운뎃점 말줄임도 처리한다', () => {
    expect(normalizeSynopsis('벌어지는데…우리가 지켜낸')).toBe('벌어지는데… 우리가 지켜낸')
    expect(normalizeSynopsis('처하는데···!위험에 빠진')).toBe('처하는데···! 위험에 빠진')
  })

  it('닫는 따옴표 뒤 마침표도 문장 끝으로 본다', () => {
    expect(normalizeSynopsis('‘조디’.고대하던 게임')).toBe('‘조디’. 고대하던 게임')
  })

  it('약어 뒤 조사는 건드리지 않는다', () => {
    expect(normalizeSynopsis('엘리어트는 E.T.와 교감한다')).toBe('엘리어트는 E.T.와 교감한다')
    expect(normalizeSynopsis("'Mr.폭스'의 작전")).toBe("'Mr.폭스'의 작전")
    expect(normalizeSynopsis('마담 D.의 피살사건')).toBe('마담 D.의 피살사건')
    expect(normalizeSynopsis('트레이시는 C.K.가 아끼는')).toBe('트레이시는 C.K.가 아끼는')
  })

  it('소수점과 숫자 표기를 깨지 않는다', () => {
    expect(normalizeSynopsis('차이는 0.02초')).toBe('차이는 0.02초')
    expect(normalizeSynopsis('최고기록 10초 07.세계 육상')).toBe('최고기록 10초 07.세계 육상')
  })

  it('평서형 종결어미 뒤 새 문장을 띄운다', () => {
    expect(normalizeSynopsis('시작은 호기심이었다그곳은 대체')).toBe('시작은 호기심이었다 그곳은 대체')
    expect(normalizeSynopsis('찾을 수 없다당신도 입장하시겠습니까')).toBe('찾을 수 없다 당신도 입장하시겠습니까')
    expect(normalizeSynopsis('소녀를 만난다마을 주민들은')).toBe('소녀를 만난다 마을 주민들은')
    expect(normalizeSynopsis('정의가 파괴된다사상 최악의')).toBe('정의가 파괴된다 사상 최악의')
  })

  it('점으로 나눈 표기는 붙여 둔다', () => {
    expect(normalizeSynopsis('알고 보니 동.상.이.몽?문숙:')).toBe('알고 보니 동.상.이.몽? 문숙:')
    expect(normalizeSynopsis('문을 두드려 봐…똑..똑..똑')).toBe('문을 두드려 봐… 똑..똑..똑')
  })

  it('연결어미로 이어지는 -다는/-다고/-다가는 띄우지 않는다', () => {
    expect(normalizeSynopsis('돈을 맡겨놓았다는 이야기')).toBe('돈을 맡겨놓았다는 이야기')
    expect(normalizeSynopsis('죽였다며 사랑을 고백한다')).toBe('죽였다며 사랑을 고백한다')
    expect(normalizeSynopsis('포로가 되었다가 이송되어')).toBe('포로가 되었다가 이송되어')
    expect(normalizeSynopsis('흔적을 찾아다니다가 우연히')).toBe('흔적을 찾아다니다가 우연히')
  })

  it('종결어미가 아닌 -다 어휘는 그대로 둔다', () => {
    expect(normalizeSynopsis('그는 다시 다른 다큐멘터리를 만든다')).toBe(
      '그는 다시 다른 다큐멘터리를 만든다',
    )
  })

  it('공백을 정리하고 null을 그대로 통과시킨다', () => {
    expect(normalizeSynopsis('  줄바꿈\n\n정리  ')).toBe('줄바꿈 정리')
    expect(normalizeSynopsis(null)).toBeNull()
    expect(normalizeSynopsis(undefined)).toBeNull()
  })

  it('이미 띄어진 문장은 바꾸지 않는다', () => {
    const clean = '그날의 기억. 그리고 남은 사람들. 우리는 무엇을 보았나?'
    expect(normalizeSynopsis(clean)).toBe(clean)
  })
})
