import raw from './manifest.json'
import type { Manifest } from './types'

/** 사이트가 읽는 유일한 데이터. `npm run ds:build`로 다시 만든다. */
export const manifest = raw as unknown as Manifest

export * from './types'
