/**
 * Build data/subway/stations.json from the Seoul Metro station address CSV.
 *
 * Source CSV:
 *   data/subway/seoulmetro-station-address-20250318.csv
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/build-subway-stations-from-addresses.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/build-subway-stations-from-addresses.ts --write
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

interface SourceStationRow {
  sequence: string
  stationNumber: string
  line: string
  name: string
  phone: string
  roadAddress: string
  lotAddress: string
}

interface KakaoAddressDocument {
  x: string
  y: string
  address_name?: string
  address?: {
    region_1depth_name?: string
    region_2depth_name?: string
    region_3depth_name?: string
  } | null
  road_address?: {
    region_1depth_name?: string
    region_2depth_name?: string
    region_3depth_name?: string
  } | null
}

interface KakaoAddressResponse {
  documents?: KakaoAddressDocument[]
}

interface StationOutput {
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

interface GeocodedRow {
  row: SourceStationRow
  lat: number
  lng: number
  city: string
  district: string | null
  neighborhood: string | null
}

const INPUT_FILE = join(process.cwd(), 'data/subway/seoulmetro-station-address-20250318.csv')
const OUTPUT_FILE = join(process.cwd(), 'data/subway/stations.json')
const REQUEST_DELAY_MS = 120

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells.map((cell) => cell.trim())
}

function parseStationRows(csv: string): SourceStationRow[] {
  const lines = csv.split(/\r?\n/).filter(Boolean)
  return lines.slice(1).map((line) => {
    const [sequence, stationNumber, rawLine, rawName, phone, roadAddress, lotAddress] = parseCsvLine(line)
    return {
      sequence,
      stationNumber,
      line: normalizeLine(rawLine),
      name: rawName.trim(),
      phone,
      roadAddress,
      lotAddress,
    }
  }).filter((row) => row.name && row.line)
}

function normalizeLine(line: string): string {
  const value = line.trim()
  if (/^\d+$/.test(value)) return `${Number(value)}호선`
  if (/^\d+호선$/.test(value)) return value
  return value
}

function stationDisplayName(name: string): string {
  return name.endsWith('역') ? name : `${name}역`
}

function sourceId(name: string): string {
  return `seoulmetro-${name}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣_-]/g, '')
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function splitAddress(address: string): { city: string; district: string | null; neighborhood: string | null } {
  const [city = '', district, neighborhood] = address.split(/\s+/)
  return {
    city,
    district: district ?? null,
    neighborhood: neighborhood ?? null,
  }
}

async function geocodeAddress(address: string, apiKey: string): Promise<KakaoAddressDocument | null> {
  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json')
  url.searchParams.set('query', address)

  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })

  if (!response.ok) {
    throw new Error(`Kakao geocode failed: ${response.status} ${response.statusText}`)
  }

  const body = await response.json() as KakaoAddressResponse
  return body.documents?.[0] ?? null
}

async function geocodeRow(row: SourceStationRow, apiKey: string): Promise<GeocodedRow | null> {
  for (const address of [row.roadAddress, row.lotAddress]) {
    if (!address) continue
    const document = await geocodeAddress(address, apiKey)
    if (!document) {
      await sleep(REQUEST_DELAY_MS)
      continue
    }

    const lat = Number(document.y)
    const lng = Number(document.x)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const region = document.road_address ?? document.address
    const fallback = splitAddress(document.address_name ?? address)
    return {
      row,
      lat,
      lng,
      city: region?.region_1depth_name ?? fallback.city,
      district: region?.region_2depth_name ?? fallback.district,
      neighborhood: region?.region_3depth_name ?? fallback.neighborhood,
    }
  }

  return null
}

function mergeRows(rows: GeocodedRow[]): StationOutput[] {
  const grouped = new Map<string, GeocodedRow[]>()

  for (const row of rows) {
    const key = row.row.name
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }

  return Array.from(grouped.entries()).map(([name, group]) => {
    const displayName = stationDisplayName(name)
    const first = group[0]
    const lines = unique(group.map((item) => item.row.line)).sort((a, b) => a.localeCompare(b, 'ko'))
    const lat = group.reduce((sum, item) => sum + item.lat, 0) / group.length
    const lng = group.reduce((sum, item) => sum + item.lng, 0) / group.length

    return {
      source_id: sourceId(name),
      name: displayName,
      lines,
      lat: Number(lat.toFixed(8)),
      lng: Number(lng.toFixed(8)),
      city: first.city || '서울특별시',
      district: first.district,
      neighborhood: first.neighborhood,
      aliases: unique([name, displayName]),
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

function lineSummary(stations: StationOutput[]): string[] {
  const counts = new Map<string, number>()
  for (const station of stations) {
    for (const line of station.lines) {
      counts.set(line, (counts.get(line) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'ko'))
    .map(([line, count]) => `${line}: ${count}`)
}

async function main() {
  const apiKey = process.env.KAKAO_REST_API_KEY
  const write = process.argv.includes('--write')
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : undefined

  if (!apiKey) throw new Error('Missing KAKAO_REST_API_KEY')

  const csv = await readFile(INPUT_FILE, 'utf8')
  const sourceRows = parseStationRows(csv)
  const targetRows = Number.isFinite(limit) ? sourceRows.slice(0, limit) : sourceRows
  const geocoded: GeocodedRow[] = []
  const failed: SourceStationRow[] = []

  for (const [index, row] of targetRows.entries()) {
    const result = await geocodeRow(row, apiKey)
    if (result) geocoded.push(result)
    else failed.push(row)

    if ((index + 1) % 25 === 0 || index === targetRows.length - 1) {
      console.log(`geocoded ${index + 1}/${targetRows.length}`)
    }

    await sleep(REQUEST_DELAY_MS)
  }

  const stations = mergeRows(geocoded)
  console.log(`source rows: ${sourceRows.length}`)
  console.log(`processed rows: ${targetRows.length}`)
  console.log(`geocoded rows: ${geocoded.length}`)
  console.log(`failed rows: ${failed.length}`)
  console.log(`merged stations: ${stations.length}`)
  console.log(lineSummary(stations).join('\n'))

  if (failed.length > 0) {
    console.log('failed:')
    for (const row of failed) {
      console.log(`- ${row.line} ${row.name}: ${row.roadAddress || row.lotAddress}`)
    }
  }

  if (write) {
    await writeFile(OUTPUT_FILE, `${JSON.stringify({ stations }, null, 2)}\n`, 'utf8')
    console.log(`wrote ${OUTPUT_FILE}`)
  } else {
    console.log('dry run only. pass --write to create data/subway/stations.json')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
