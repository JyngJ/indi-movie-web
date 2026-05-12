# Subway Data Import

Place source files here before running the seed script.

Recommended source:
- Kaggle `Seoul Subway Geospatial Data`
- License shown on Kaggle: CC0 Public Domain
- CRS: EPSG:4326

Expected files:
- `data/subway/stations.json`
- `data/subway/lines.geojson`

Before seeding, run the new `stations`, `areas`, and `subway_lines` schema blocks in:

```text
docs/SUPABASE.sql
```

Run:

```bash
npx tsx --env-file=.env.local scripts/seed-subway-data.ts
```

The script upserts stations and subway line geometries into Supabase.
For the map overlay, copy or export the desired line GeoJSON to:

```text
src/data/subway-lines.json
```

The app renders that GeoJSON only at zoom 15 or higher.
