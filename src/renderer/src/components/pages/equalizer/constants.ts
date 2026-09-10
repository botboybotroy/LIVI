/** Band centre frequencies, matching CamillaDSP's ten peaking filters. */
export const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const

export const EQ_BAND_COUNT = EQ_FREQUENCIES.length

export const EQ_MIN_DB = -12
export const EQ_MAX_DB = 12
/** Drag resolution, and the step an arrow key moves a band. */
export const EQ_STEP_DB = 0.5
export const EQ_KEY_STEP_DB = 1
export const EQ_PAGE_STEP_DB = 3

/** The dB values that get a grid line and an axis label. */
export const EQ_GRID_DB = [12, 6, 0, -6, -12] as const

export const EQ_FLAT: readonly number[] = Object.freeze(new Array(EQ_BAND_COUNT).fill(0))

export const EQ_PRESETS: Record<string, readonly number[]> = {
  Flat: EQ_FLAT,
  Bass: [6, 5, 4, 2, 0, 0, 0, 1, 2, 3],
  Vocal: [-2, -1, 0, 2, 4, 4, 3, 2, 1, 0],
  Rock: [4, 3, 1, 0, -1, -1, 0, 2, 3, 4],
  Treble: [-3, -3, -2, -1, 0, 1, 3, 5, 6, 6]
}

export const EQ_PRESET_NAMES = Object.keys(EQ_PRESETS)

/** The pad clamps the dot to this fraction of its box, so it tracks the car body. */
export const PAD_RADIUS = 0.42

export function formatHz(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`
}

export function formatDb(db: number): string {
  const rounded = Math.round(db * 10) / 10
  const body = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)
  return rounded > 0 ? `+${body}` : body
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Coerces a stored value into exactly EQ_BAND_COUNT in-range gains. */
export function normalizeBands(bands: readonly number[] | undefined): number[] {
  const out = new Array<number>(EQ_BAND_COUNT).fill(0)
  if (!bands) return out
  for (let i = 0; i < EQ_BAND_COUNT; i++) {
    const v = bands[i]
    out[i] = typeof v === 'number' && Number.isFinite(v) ? clamp(v, EQ_MIN_DB, EQ_MAX_DB) : 0
  }
  return out
}

/** The preset these gains came from, or null once they have been edited. */
export function matchPreset(bands: readonly number[]): string | null {
  for (const name of EQ_PRESET_NAMES) {
    const preset = EQ_PRESETS[name]
    if (bands.every((v, i) => Math.abs(v - (preset[i] ?? 0)) < 0.001)) return name
  }
  return null
}
