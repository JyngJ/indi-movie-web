/** 매니페스트 타입 — scripts/design-system/build-manifest.mjs가 만드는 JSON의 형태.
 *  JSON을 직접 import하면 TS가 리터럴 유니온으로 추론해 다루기 나쁘다. 여기서 한 번 캐스팅한다. */

export interface Token {
  name: string
  value: string
  comment: string
  resolved: string
  figma: { name: string; value: string; alias: string | null; collection: string } | null
}

export interface TokenGroup {
  title: string
  tokens: Token[]
}

export interface FigmaVariant {
  props: Record<string, string>
  w: number | null
  h: number | null
  radius: number | null
  pad: number[] | null
  gap: number | null
  dir: string | null
  fill: string | null
}

export interface ComponentProp {
  name: string
  type: string
  optional: boolean
  default: string | null
  doc: string
}

export interface ComponentEntry {
  name: string
  file: string
  doc: string
  props: ComponentProp[]
  figmaSet: string | null
  figma: { name: string; axes: Record<string, string[]>; variants: FigmaVariant[] } | null
}

export interface DriftEntry {
  kind: 'token-value' | 'figma-only' | 'type-scale' | 'component-unmapped' | string
  id: string
  code: string | null
  figma: string | null
  note: string
}

export interface Manifest {
  generatedAt: string
  figmaDumpAt: string | null
  tokenGroups: TokenGroup[]
  typography: {
    code: { name: string; value: string; comment: string }[]
    figma: { name: string; font: string; size: number; lineHeight: string | number }[]
  }
  effects: { name: string; effects: unknown[] }[]
  figmaCollections: {
    name: string
    modes: string[]
    count: number
    vars: { name: string; value: unknown; scopes: string[] }[]
  }[]
  components: ComponentEntry[]
  drift: DriftEntry[]
}
