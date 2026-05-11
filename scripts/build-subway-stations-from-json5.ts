/**
 * Build data/subway/stations.json from the CC0 Korean subway station JSON5 gist.
 *
 * Source:
 *   data/subway/korean-subway-station-list.json5
 *
 * Usage:
 *   npx tsx scripts/build-subway-stations-from-json5.ts
 *   npx tsx scripts/build-subway-stations-from-json5.ts --write
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

interface RawStation {
  name: string
  city?: string
  areas?: string[]
  lines?: string[]
  lat: number
  lng: number
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

const INPUT_FILE = join(process.cwd(), 'data/subway/korean-subway-station-list.json5')
const OUTPUT_FILE = join(process.cwd(), 'data/subway/stations.json')

const INCLUDE_LINE_PATTERN = /(호선|신분당|수인분당|분당|경의중앙|경춘|경강|공항철도|우이신설|서해|김포\s*골드|김포골드|인천|의정부|용인|신림선|에버라인)/i
const EXCLUDE_LINE_PATTERN = /(ktx|srt|itx|gtx|새마을|무궁화|누리로)/i
const METROPOLITAN_BOUNDS = {
  minLat: 36.8,
  maxLat: 38.45,
  minLng: 126.0,
  maxLng: 128.3,
}

function parseJson5Subset(text: string): RawStation[] {
  const withoutComments = text
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
  const json = withoutComments
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, value: string) => JSON.stringify(value))
    .replace(/,\s*([}\]])/g, '$1')

  return JSON.parse(json) as RawStation[]
}

function sourceId(name: string): string {
  return `cc0-korean-subway-${name}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣_-]/g, '')
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function normalizeLine(line: string): string {
  const compact = line.replace(/\s+/g, '')
  if (compact === '경의중앙') return '경의중앙선'
  if (compact === '김포골드라인') return '김포골드라인'
  if (compact === '의정부선') return '의정부경전철'
  if (compact === '에버라인') return '용인경전철'
  return compact
}

function isSupportedStation(station: RawStation): boolean {
  if (!Number.isFinite(station.lat) || !Number.isFinite(station.lng)) return false
  if (
    station.lat < METROPOLITAN_BOUNDS.minLat ||
    station.lat > METROPOLITAN_BOUNDS.maxLat ||
    station.lng < METROPOLITAN_BOUNDS.minLng ||
    station.lng > METROPOLITAN_BOUNDS.maxLng
  ) return false
  const lines = station.lines ?? []
  return lines.some((line) => INCLUDE_LINE_PATTERN.test(line) && !EXCLUDE_LINE_PATTERN.test(line))
}

function inferCity(areas: string[]): string {
  const firstArea = areas[0] ?? ''
  if (firstArea === '인천' || firstArea.includes('인천')) return '인천광역시'
  if (firstArea.endsWith('구')) return '서울특별시'
  if (firstArea) return '경기도'
  return '서울특별시'
}

function toStationOutput(station: RawStation): StationOutput {
  const areas = station.areas ?? []
  const lines = unique((station.lines ?? [])
    .filter((line) => INCLUDE_LINE_PATTERN.test(line) && !EXCLUDE_LINE_PATTERN.test(line))
    .map(normalizeLine))
    .sort((a, b) => a.localeCompare(b, 'ko'))

  const nameWithoutSuffix = station.name.endsWith('역') ? station.name.slice(0, -1) : station.name

  return {
    source_id: sourceId(station.name),
    name: station.name,
    lines,
    lat: Number(station.lat.toFixed(8)),
    lng: Number(station.lng.toFixed(8)),
    city: inferCity(areas),
    district: areas[0] ?? null,
    neighborhood: null,
    aliases: unique([station.name, nameWithoutSuffix]),
  }
}

function mergeStations(stations: StationOutput[]): StationOutput[] {
  const groups = new Map<string, StationOutput[]>()

  for (const station of stations) {
    groups.set(station.name, [...(groups.get(station.name) ?? []), station])
  }

  return Array.from(groups.entries()).map(([name, group]) => {
    const first = group[0]
    const lat = group.reduce((sum, station) => sum + station.lat, 0) / group.length
    const lng = group.reduce((sum, station) => sum + station.lng, 0) / group.length

    return {
      ...first,
      source_id: sourceId(name),
      lines: unique(group.flatMap((station) => station.lines)).sort((a, b) => a.localeCompare(b, 'ko')),
      lat: Number(lat.toFixed(8)),
      lng: Number(lng.toFixed(8)),
      district: unique(group.map((station) => station.district ?? '')).join(', ') || null,
      aliases: unique(group.flatMap((station) => station.aliases)),
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
  const write = process.argv.includes('--write')
  const rawText = await readFile(INPUT_FILE, 'utf8')
  const rawStations = parseJson5Subset(rawText)
  const stations = mergeStations(rawStations
    .filter(isSupportedStation)
    .map(toStationOutput))

  console.log(`source stations: ${rawStations.length}`)
  console.log(`filtered stations: ${stations.length}`)
  console.log(lineSummary(stations).join('\n'))

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
