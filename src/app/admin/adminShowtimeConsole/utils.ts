export function groupByCity<T extends { city: string }>(items: T[]): [string, T[]][] {
  const order = (city: string) => city === '서울' ? 0 : 1
  const map = new Map<string, T[]>()
  for (const item of items) {
    const list = map.get(item.city) ?? []
    list.push(item)
    map.set(item.city, list)
  }
  return Array.from(map.entries()).sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b, 'ko'))
}

export function normalizeSearchText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function upsertOption<T extends { id: string }>(options: T[], option: T) {
  return options.some((item) => item.id === option.id)
    ? options.map((item) => (item.id === option.id ? option : item))
    : [...options, option]
}

export function splitListInput(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}
