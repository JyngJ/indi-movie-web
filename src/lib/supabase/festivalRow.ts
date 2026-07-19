import { safeUrl } from '@/lib/seo/safeUrl'
import type { Festival } from '@/types/festival'

/** Supabase `festivals` row → Festival 변환 (movieRow.ts의 movieRowToMovie와 같은 원칙).
 *  banner_url/link_url은 safeUrl로 거름 — malformed punycode 등으로 next/image·href가 깨지는 것 방지. */
export function festivalRowToFestival(row: Record<string, unknown>): Festival {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    region: String(row.region),
    city: String(row.city),
    venueText: row.venue_text != null ? String(row.venue_text) : null,
    bannerUrl: safeUrl(row.banner_url as string | null | undefined) ?? null,
    linkUrl: safeUrl(row.link_url as string | null | undefined) ?? null,
    description: row.description != null ? String(row.description) : null,
    isActive: Boolean(row.is_active),
  }
}
