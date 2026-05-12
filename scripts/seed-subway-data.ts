/**
 * Seed subway stations and line geometry into Supabase.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-subway-data.ts
 *
 * Input files:
 *   data/subway/stations.json
 *   data/subway/lines.geojson
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Feature, FeatureCollection, Geometry, Point } from 'geojson'
import type { SupabaseClient } from '@supabase/supabase-js'

type RawRecord = Record<string, unknown>
type RawFeature = Feature<Geometry, RawRecord>
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

interface StationSeedRow extends Record<string, unknown> {
  source_id: string
  name: string
  lines: string[]
  lat: number
  lng: number
  city: string
  district: string | null
  neighborhood: string | null
  aliases: string[]
}

interface SubwayLineSeedRow extends Record<string, unknown> {
  source_id: string
  name: string
  line_code: string
  color: string | null
  geometry: Json
}

interface SeedDatabase {
  public: {
    Tables: {
      stations: {
        Row: Record<string, unknown> & StationSeedRow & { id: string; created_at: string; updated_at: string }
        Insert: Record<string, unknown> & StationSeedRow
        Update: Record<string, unknown> & Partial<StationSeedRow>
        Relationships: []
      }
      subway_lines: {
        Row: Record<string, unknown> & SubwayLineSeedRow & { id: string; created_at: string; updated_at: string }
        Insert: Record<string, unknown> & SubwayLineSeedRow
        Update: Record<string, unknown> & Partial<SubwayLineSeedRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type SeedSupabaseClient = SupabaseClient<SeedDatabase>

const STATIONS_FILE = join(process.cwd(), 'data/subway/stations.json')
const LINES_FILE = join(process.cwd(), 'data/subway/lines.geojson')

function asRecord(value: unknown): RawRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RawRecord : {}
}

function pickString(record: RawRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

function pickNumber(record: RawRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' || typeof item === 'number' ? String(item).trim() : '')
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/[,/|;]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === 'number' && Number.isFinite(value)) return [String(value)]
  return []
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣_-]/g, '')
}

async function readJsonFile(path: string): Promise<unknown | null> {
  try {
    const text = await readFile(path, 'utf8')
    return JSON.parse(text)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null
    throw error
  }
}

function extractArray(input: unknown, key: string): unknown[] {
  if (Array.isArray(input)) return input
  const record = asRecord(input)
  const keyed = record[key]
  if (Array.isArray(keyed)) return keyed
  if (record.type === 'FeatureCollection' && Array.isArray(record.features)) return record.features
  return []
}

function pointCoordinates(feature: RawFeature): [number, number] | undefined {
  if (feature.geometry?.type !== 'Point') return undefined
  const point = feature.geometry as Point
  const [lng, lat] = point.coordinates
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng]
  return undefined
}

function normalizeStation(input: unknown): StationSeedRow | null {
  const feature = asRecord(input) as Partial<RawFeature>
  const props = asRecord(feature.properties)
  const record = { ...asRecord(input), ...props }
  const geoPoint = feature.type === 'Feature' ? pointCoordinates(feature as RawFeature) : undefined

  const name = pickString(record, ['name', 'station_name', 'stationName', '역명', '전철역명'])
  const lat = pickNumber(record, ['lat', 'latitude', '위도', 'y']) ?? geoPoint?.[0]
  const lng = pickNumber(record, ['lng', 'lon', 'longitude', '경도', 'x']) ?? geoPoint?.[1]

  if (!name || lat === undefined || lng === undefined) return null

  const lines = unique([
    ...toStringArray(record.lines),
    ...toStringArray(record.line),
    ...toStringArray(record.line_name),
    ...toStringArray(record.lineName),
    ...toStringArray(record['호선']),
    ...toStringArray(record['노선']),
  ])

  const sourceId = pickString(record, ['source_id', 'sourceId', 'id', 'station_id', 'stationId', '역ID'])
    ?? slug(`${name}-${lines.join('-') || `${lat}-${lng}`}`)

  return {
    source_id: sourceId,
    name,
    lines,
    lat,
    lng,
    city: pickString(record, ['city', '시도', '시']) ?? '',
    district: pickString(record, ['district', '구', '시군구']) ?? null,
    neighborhood: pickString(record, ['neighborhood', 'dong', '동', '읍면동']) ?? null,
    aliases: unique([
      ...toStringArray(record.aliases),
      ...toStringArray(record.alias),
      ...toStringArray(record['별칭']),
    ]),
  }
}

function normalizeSubwayLine(feature: RawFeature): SubwayLineSeedRow | null {
  if (!feature.geometry) return null

  const props = asRecord(feature.properties)
  const name = pickString(props, ['name', 'line', 'line_name', 'lineName', '노선명', '호선'])
  const lineCode = pickString(props, ['line_code', 'lineCode', 'code', 'line', '호선']) ?? ''
  if (!name && !lineCode) return null

  const sourceId = pickString(props, ['source_id', 'sourceId', 'id'])
    ?? slug(`${lineCode || name}-line`)

  return {
    source_id: sourceId,
    name: name ?? lineCode,
    line_code: lineCode,
    color: pickString(props, ['color', 'stroke', 'line_color', 'lineColor']) ?? null,
    geometry: feature.geometry as unknown as Json,
  }
}

async function seedStations(supabase: SeedSupabaseClient) {
  const input = await readJsonFile(STATIONS_FILE)
  if (!input) {
    console.log(`skip stations: ${STATIONS_FILE} not found`)
    return
  }

  const rows = extractArray(input, 'stations')
    .map(normalizeStation)
    .filter((row): row is StationSeedRow => row !== null)

  if (rows.length === 0) {
    console.log('skip stations: no valid station rows')
    return
  }

  const { error } = await supabase
    .from('stations')
    .upsert(rows, { onConflict: 'source_id' })

  if (error) throw new Error(`stations upsert failed: ${error.message}`)
  console.log(`upserted stations: ${rows.length}`)
}

async function seedSubwayLines(supabase: SeedSupabaseClient) {
  const input = await readJsonFile(LINES_FILE)
  if (!input) {
    console.log(`skip subway lines: ${LINES_FILE} not found`)
    return
  }

  const collection = input as FeatureCollection<Geometry, RawRecord>
  const rows = (collection.features ?? [])
    .map(normalizeSubwayLine)
    .filter((row): row is SubwayLineSeedRow => row !== null)

  if (rows.length === 0) {
    console.log('skip subway lines: no valid line features')
    return
  }

  const { error } = await supabase
    .from('subway_lines')
    .upsert(rows, { onConflict: 'source_id' })

  if (error) throw new Error(`subway_lines upsert failed: ${error.message}`)
  console.log(`upserted subway lines: ${rows.length}`)
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient<SeedDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  await seedStations(supabase)
  await seedSubwayLines(supabase)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
