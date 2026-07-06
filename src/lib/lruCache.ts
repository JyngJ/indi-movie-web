export class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxLimit: number

  constructor(maxLimit: number) {
    this.cache = new Map<K, V>()
    this.maxLimit = maxLimit
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined
    const val = this.cache.get(key)!
    // 삭제 후 재삽입을 통해 가장 최근 사용으로 위치 조정
    this.cache.delete(key)
    this.cache.set(key, val)
    return val
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxLimit) {
      // Map의 첫 번째 키가 가장 오래된 키(최근에 사용되지 않은 것)
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}
