# Subway Data Import

Place source files here before running the seed/build scripts.

Recommended source:
- Kaggle `Seoul Subway Geospatial Data`
- License shown on Kaggle: CC0 Public Domain
- CRS: EPSG:4326

Expected files:
- `data/subway/stations.json`
- `data/subway/lines.geojson`
- `data/subway/korean-subway-station-list.json5`
- `data/subway/seoulmetro-station-address-20250318.csv`

Before seeding, run the new `stations`, `areas`, and `subway_lines` schema blocks in:

```text
docs/SUPABASE.sql
```

Run:

```bash
npx tsx --env-file=.env.local scripts/seed-subway-data.ts
```

The script upserts stations and subway line geometries into Supabase.

Current app behavior:
- `stations` is queried from Supabase for search results and station markers.
- Station markers and station labels render at zoom 15+.
- Zoom 15-16 uses compact marker/font sizes; zoom 17+ uses full marker/font sizes.
- Subway line colors live in frontend constants in `MapView.tsx`.
- Subway line/station opacity is 0.7 and these layers stay below theater pins, labels, and posters.

For the map overlay, build/export the desired line GeoJSON to:

```text
src/data/subway-lines.json
```

The app renders that GeoJSON only at zoom 15 or higher.

Important:
- Do not import `src/data/subway-lines.geojson` from the app. Next.js/Turbopack does not handle `.geojson` as a module without a loader.
- Keep the frontend import as `@/data/subway-lines.json`.
- If source geometry changes, regenerate `src/data/subway-lines.json` with `scripts/build-subway-lines-from-kaggle.py`.
