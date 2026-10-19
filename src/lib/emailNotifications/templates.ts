import manifest from '@/design-system/manifest.json'
import { EMAIL_DIGEST_TITLE, type EmailFilm, type EmailDigestItem, escapeHtml } from './domain'

// 메일은 CSS 변수를 지원하지 않아 디자인 시스템의 확정 값을 인라인으로 넣는다.
const tokens = new Map(manifest.tokenGroups.flatMap(group => group.tokens.map(token => [token.name, token.resolved] as const)))
function token(name: string): string {
  const value = tokens.get(name)
  if (!value) throw new Error(`Missing email design token: ${name}`)
  return value
}
const theme = {
  ink: token('--color-text-primary'), sub: token('--color-text-sub'),
  primary: token('--color-primary-base'), surface: token('--color-surface-card'),
  body: token('--text-body'), meta: token('--text-meta'), title: token('--text-h1'), section: token('--text-h2'), tint: token('--color-primary-100'), background: token('--color-surface-bg'),
}
const paragraph = (text: string) => `<p style="margin:0 0 24px;color:${theme.sub};line-height:1.8">${escapeHtml(text)}</p>`
const button = (label: string, url: string) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" bgcolor="${theme.primary}" style="border-radius:8px"><a href="${escapeHtml(url)}" style="display:block;padding:16px 24px;color:${theme.surface};text-decoration:none;font-weight:bold;line-height:1.5">${escapeHtml(label)}</a></td></tr></table>`
function shell(origin: string, title: string, body: string, footer: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:${theme.background};font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:${theme.ink};font-size:${theme.body};word-break:keep-all"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${theme.surface}" style="max-width:600px"><tr><td><a href="${escapeHtml(origin)}"><img src="${escapeHtml(origin + '/email/header-v3.png')}" width="600" alt="영화볼지도 로고" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr><tr><td style="padding:32px 24px"><h1 style="margin:0 0 20px;font-size:${theme.title};line-height:1.5">${escapeHtml(title)}</h1>${body}</td></tr><tr><td><a href="${escapeHtml(origin)}"><img src="${escapeHtml(origin + '/email/footer-v3.png')}" width="600" alt="영화볼지도 로고" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr><tr><td style="padding:24px;color:${theme.sub};font-size:${theme.meta};line-height:1.8">${footer}<br><a href="${escapeHtml(origin + '/my/notifications/email')}" style="color:${theme.sub}">이메일 소식 설정하기</a> · <a href="${escapeHtml(origin + '/privacy')}" style="color:${theme.sub}">개인정보 처리방침</a></td></tr></table></td></tr></table></body></html>`
}
export function renderVerificationEmail(origin: string, url: string): string {
  return shell(origin, '이메일을 인증해 주세요',
    paragraph('이메일을 인증하면 관심 영화·감독·극장의 상영 소식을 받을 수 있어요. 새 소식이 있을 때 월·금 오전 9시에 보내 드려요.') + button('이메일 인증하기', url),
    '링크는 1시간 동안 사용할 수 있어요<br>요청하지 않았다면 이 메일을 무시해 주세요')
}
export function emailPosterUrl(value?: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || !['file.koreafilm.or.kr', 'upload.wikimedia.org', 'pkmgloiixwvhitqpcfyc.supabase.co'].includes(url.hostname)) return null
    url.protocol = 'https:'
    return url.href
  } catch { return null }
}

function filmRows(items: EmailFilm[], origin: string): string {
  return items.map(item => {
    const poster = emailPosterUrl(item.posterUrl)
    const href = escapeHtml(origin + item.path)
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px"><tr>${poster ? `<td width="112" valign="top"><a href="${href}"><img src="${escapeHtml(poster)}" width="96" height="140" alt="${escapeHtml(item.title)} 포스터" style="display:block;object-fit:cover;border-radius:4px;border:0"></a></td>` : ''}<td valign="middle"><a href="${href}" style="font-weight:bold;color:${theme.ink};text-decoration:none;line-height:1.6">${escapeHtml(item.title)}</a><p style="margin:8px 0 16px;color:${theme.sub};font-size:${theme.meta};line-height:1.8">${escapeHtml(item.description)}</p><a href="${href}" style="display:inline-block;padding:12px 16px;background:${theme.tint};border-radius:8px;color:${theme.primary};font-size:${theme.meta};font-weight:bold;text-decoration:none">예매하러 가기 →</a></td></tr></table>`
  }).join('')
}
function filmGrid(films: EmailFilm[], origin: string): string {
  const rows: string[] = []
  for (let i = 0; i < films.length; i += 3) {
    const cells = films.slice(i, i + 3).map((film, index) => {
      const href = escapeHtml(origin + film.path)
      const poster = emailPosterUrl(film.posterUrl)
      return `<td width="33.33%" valign="top" style="padding:${index === 0 ? '0 8px 24px 0' : index === 1 ? '0 4px 24px 4px' : '0 0 24px 8px'}"><a href="${href}" style="display:block;color:${theme.ink};text-decoration:none">${poster ? `<img src="${escapeHtml(poster)}" width="256" alt="${escapeHtml(film.title)} 포스터" style="display:block;width:100%;max-width:256px;height:auto;border-radius:4px;border:0;margin-bottom:12px">` : ''}<span style="font-weight:bold;line-height:1.6">${escapeHtml(film.title)}</span></a>${film.directors?.length ? `<p style="margin:4px 0 0;font-size:${theme.meta};color:${theme.sub};line-height:1.6">${escapeHtml(film.directors.join('·'))}</p>` : ''}</td>`
    }).join('')
    rows.push(`<tr>${cells}${'<td width="33.33%"></td>'.repeat(3 - Math.min(3, films.length - i))}</tr>`)
  }
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed">${rows.join('')}</table>`
}
function interestSections(items: Omit<EmailDigestItem, 'eventIds'>[], origin: string): string {
  const movies = items.filter(item => !item.groupType || item.groupType === 'movie')
  const groups = new Map<string, { name: string; type: 'director' | 'theater'; path?: string; films: EmailFilm[] }>()
  for (const item of items) {
    if (item.groupType !== 'director' && item.groupType !== 'theater') continue
    const key = `${item.groupType}:${item.groupPath ?? item.groupName}`
    const group = groups.get(key) ?? { name: item.groupName ?? '', type: item.groupType, path: item.groupPath, films: [] }
    const paths = new Set(group.films.map(f => f.path))
    for (const film of item.films ?? [item]) if (!paths.has(film.path)) { group.films.push(film); paths.add(film.path) }
    groups.set(key, group)
  }
  const heading = (title: string) => `<h2 style="color:${theme.primary};font-weight:600;font-size:${theme.section};line-height:1.5;margin:0 0 20px">${escapeHtml(title)}</h2>`
  return (movies.length ? heading('관심 영화') + filmRows(movies, origin) : '') + [...groups.values()].map(group => `<div style="border-top:1px solid ${theme.tint};padding-top:32px;margin-top:32px">${heading(`${group.type === 'director' ? '관심 감독' : '관심 극장'} · ${group.name}`)}${filmGrid(group.films, origin)}${group.path ? button(`${group.name} 상영 더 보기`, origin + group.path) : ''}</div>`).join('')
}
export function renderDigestEmail(input: { origin: string; items: Omit<EmailDigestItem, 'eventIds'>[]; recommendations?: EmailFilm[]; unsubscribeUrl: string; frequency: { label: string; url: string }[] }): string {
  const recommended = input.recommendations ?? []
  const weekly = recommended.length ? `<div style="border-top:1px solid ${theme.tint};padding-top:32px;margin-top:32px"><h2 style="color:${theme.primary};font-weight:600;font-size:${theme.section};line-height:1.5;margin:0 0 12px">이번 주 이런 상영도 있어요</h2>${filmRows(recommended, input.origin)}</div>` : ''
  const explore = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${theme.tint}" style="margin-top:32px;border-radius:8px"><tr><td style="padding:24px">${paragraph('다른 영화와 극장의 상영도 영화볼지도에서 확인할 수 있어요')}${button('다른 상영 구경하러 가기', input.origin + '/films')}</td></tr></table>`
  return shell(input.origin, EMAIL_DIGEST_TITLE, interestSections(input.items, input.origin) + weekly + explore,
    '서비스를 쓰면서 겪은 불편이나 버그, 제안이 있으면 이 메일에 답장해 주세요.<br><br>상영 소식 수신에 동의한 주소로 보냈어요.<br>새 소식이 있을 때 월·금 오전 9시에 보내 드려요.<br><br>' + input.frequency.map(item => `<a href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a> `).join('') + `<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${theme.sub}">이메일 소식 그만 받기</a>`)
}
