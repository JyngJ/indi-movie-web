# Analytics

This project uses three analytics layers:

- PostHog: product analytics, funnels, retention, session replay, and event dashboards.
- Google Analytics 4: marketing acquisition, UTM/referrer reporting, and campaign conversion checks.
- Vercel Web Analytics: deployment traffic and lightweight operational analytics.

## Environment

Set these variables in local and production environments:

```bash
NEXT_PUBLIC_POSTHOG_TOKEN=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

`NEXT_PUBLIC_POSTHOG_TOKEN` and `NEXT_PUBLIC_GA_MEASUREMENT_ID` are optional. When they are absent, custom events still log to the browser console in development and are skipped in production.

## Event Taxonomy

Core events are typed in `src/lib/analytics/types.ts` and emitted through `trackEvent` in `src/lib/analytics/client.ts`.

| Event | Purpose |
| --- | --- |
| `map viewed` | Home map session starts. |
| `search opened` | Search overlay opens. |
| `search performed` | Debounced search query with result counts. |
| `search no results` | Search query has zero results. |
| `search result selected` | User selects a movie, theater, director, station, or area result. |
| `map filter changed` | Date, genre, nation, bookable, or movie filter changes. |
| `map pin clicked` | Theater pin opens from the map. |
| `theater sheet opened` | Theater bottom sheet or desktop theater panel opens. |
| `theater date changed` | Theater sheet date changes. |
| `theater movie selected` | User selects a movie inside a theater sheet. |
| `showtime selected` | User selects a showtime, including whether it has a booking URL. |
| `booking clicked` | User clicks the booking CTA. |
| `directions clicked` | User clicks directions. |
| `movie detail viewed` | Movie detail page or desktop panel is viewed. |
| `movie theaters map opened` | Movie detail sends user back to the map with a movie filter. |
| `movie theater selected` | User chooses a theater/showtime from the movie detail theater list. |
| `session intent classified` | Session is classified as type A, B, C, or mixed. |

All events include session context:

- `analytics_session_id`
- `session_started_at`
- `time_since_session_start_ms`
- `landing_path`
- `referrer`
- UTM parameters
- `device_type`
- viewport width/height
- `session_intent`

Milestone properties are added automatically:

- `map pin clicked`: `is_first_pin_click`, `first_pin_click_elapsed_ms`
- `booking clicked` and `directions clicked`: `is_first_final_action`, `first_final_action_elapsed_ms`

## Dashboard Plan

### Marketing Dashboard

Use this for campaign review:

- Acquisition: sessions by `utm_source`, `utm_medium`, `utm_campaign`, `referrer`, and `landing_path`.
- Activation: `search opened`, `search performed`, `map pin clicked`, and `theater sheet opened` rates.
- Conversion: `booking clicked` and `directions clicked` by campaign, source, device, movie, and theater.
- Demand: top `movie_id`, `theater_id`, `search_term`, search no-result rate, and filter zero-result rate.
- Retention: returning anonymous users, repeated `theater_id`, and `session_intent=type_c`.

### Product Funnel Dashboard

Type A, known movie:

1. `search performed`
2. `search result selected` where `result_type=movie`
3. `map filter changed` with `movie_filter_id`
4. `theater sheet opened`
5. `showtime selected`
6. `booking clicked` or `directions clicked`

Type B, discovery:

1. `map viewed`
2. `map filter changed` or `map pin clicked`
3. `theater sheet opened`
4. `theater movie selected`
5. `showtime selected`
6. `booking clicked` or `directions clicked`

Type C, theater fan:

1. `map viewed` with `source=direct_link` or `theater sheet opened` with `source=direct_link`
2. `theater date changed`
3. `showtime selected`
4. `booking clicked` or `directions clicked`

## Metric Mapping

| Metric | How to calculate |
| --- | --- |
| Time to first pin click | `first_pin_click_elapsed_ms` on first `map pin clicked`. |
| Time to first final action | `first_final_action_elapsed_ms` on first `booking clicked` or `directions clicked`. |
| Theaters viewed per session | Unique `theater_id` on `theater sheet opened` by `analytics_session_id`. |
| Movies viewed per session | Unique `movie_id` across `movie detail viewed`, `theater movie selected`, and movie search selections. |
| Repeated same theater | Same anonymous user with repeated `theater_id` across sessions. |
| Search no-result rate | `search no results` / `search performed`. |
| Search to result click rate | `search result selected` / `search performed`. |
| Filter zero-result rate | `map filter changed` where `is_zero_result=true`. |
| Showtime without booking URL | `showtime selected` where `has_booking_url=false`. |
| Directions vs booking | Compare `directions clicked` and `booking clicked`. |
| Acquisition | UTM/referrer properties on all events. |
| Device split | `device_type`, `viewport_width`, and `viewport_height`. |

## 프로덕션 가동 확인 (2026-07-05)

- **크롤 헬스체크 자동화**: `scripts/check-crawl-health.ts`가 `crawl_runs`의 `status='completed'` 기준 마지막 성공 크롤 시각을 확인해 15시간 초과 시 Discord로 알림을 보내도록 확장됨 (PR #132). RPi(`pi@100.76.84.97`)에서 `main` pull 완료, 수동 1회 실행으로 Supabase 조회·Discord 웹훅 전송 정상 동작 확인, crontab에 4시간 간격(`0 */4 * * *`)으로 등록 완료.
- **분석 이벤트 프로덕션 유입 확인**: 미확인. Vercel `indi-movie-web` 프로젝트 Production 환경변수(`NEXT_PUBLIC_POSTHOG_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`)와 PostHog Live Events / GA4 실시간 보고서 확인은 Vercel/PostHog/GA 대시보드 접근이 필요해 별도로 진행 필요.
