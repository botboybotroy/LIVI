import Switch from '@mui/material/Switch'
import { useTheme } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import type { Config } from '@shared/types'
import { useLiviStore } from '@store/store'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BalancePad } from './BalancePad'
import {
  clamp,
  EQ_PRESET_NAMES,
  EQ_PRESETS,
  matchPreset,
  normalizeBands,
  PAD_RADIUS
} from './constants'
import { EqGrid } from './EqGrid'

// A drag emits a value per frame; the config only needs the settled one.
const SAVE_DEBOUNCE_MS = 200

export function Equalizer() {
  const theme = useTheme()
  const settings = useLiviStore((s) => s.settings)
  const saveSettings = useLiviStore((s) => s.saveSettings)

  const [enabled, setEnabled] = useState(false)
  const [bands, setBands] = useState<number[]>(() => normalizeBands(undefined))
  const [fade, setFade] = useState(0.5)
  const [balance, setBalance] = useState(0.5)

  // Seed from the stored config once it has arrived, then stop following it so
  // an in-flight drag is not fought by the write it just triggered.
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current || !settings) return
    hydrated.current = true
    const lo = 0.5 - PAD_RADIUS
    const hi = 0.5 + PAD_RADIUS
    setEnabled(settings.equalizerEnabled === true)
    setBands(normalizeBands(settings.equalizerBands))
    setFade(clamp(settings.equalizerFade ?? 0.5, lo, hi))
    setBalance(clamp(settings.equalizerBalance ?? 0.5, lo, hi))
  }, [settings])

  const pending = useRef<Partial<Config>>({})
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persist = useCallback(
    (patch: Partial<Config>) => {
      pending.current = { ...pending.current, ...patch }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null
        const next = pending.current
        pending.current = {}
        void saveSettings(next)
      }, SAVE_DEBOUNCE_MS)
    },
    [saveSettings]
  )

  // Leaving the page must not drop the last edit.
  useEffect(() => {
    return () => {
      if (!saveTimer.current) return
      clearTimeout(saveTimer.current)
      saveTimer.current = null
      if (Object.keys(pending.current).length > 0) {
        const next = pending.current
        pending.current = {}
        void saveSettings(next)
      }
    }
  }, [saveSettings])

  const setBand = useCallback(
    (index: number, db: number) => {
      if (bands[index] === db && enabled) return
      const next = bands.slice()
      next[index] = db
      setBands(next)

      const patch: Partial<Config> = { equalizerBands: next }
      // Touching a band is an implicit "turn this on".
      if (!enabled) {
        setEnabled(true)
        patch.equalizerEnabled = true
      }
      persist(patch)
    },
    [bands, enabled, persist]
  )

  const applyPreset = useCallback(
    (name: string) => {
      const next = normalizeBands(EQ_PRESETS[name])
      setBands(next)
      setEnabled(true)
      persist({ equalizerBands: next, equalizerEnabled: true })
    },
    [persist]
  )

  const setPad = useCallback(
    (nextFade: number, nextBalance: number) => {
      setFade(nextFade)
      setBalance(nextBalance)
      persist({ equalizerFade: nextFade, equalizerBalance: nextBalance })
    },
    [persist]
  )

  const toggleEnabled = useCallback(
    (next: boolean) => {
      setEnabled(next)
      persist({ equalizerEnabled: next })
    },
    [persist]
  )

  const resetAll = useCallback(() => {
    const flat = normalizeBands(undefined)
    setBands(flat)
    setFade(0.5)
    setBalance(0.5)
    persist({ equalizerBands: flat, equalizerFade: 0.5, equalizerBalance: 0.5 })
  }, [persist])

  const activePreset = matchPreset(bands)

  const chipStyle = (active: boolean): React.CSSProperties => ({
    font: 'inherit',
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 999,
    padding: '5px 12px',
    lineHeight: 1.3,
    border: `1px solid ${active ? theme.palette.primary.main : theme.palette.divider}`,
    backgroundColor: active ? theme.palette.primary.main : 'transparent',
    color: active ? theme.palette.background.default : theme.palette.text.secondary
  })

  return (
    <div
      id="equalizer-root"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '20px 24px',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary
      }}
    >
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Typography style={{ fontSize: 22, fontWeight: 600 }}>Equalizer</Typography>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {EQ_PRESET_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={activePreset === name}
              onClick={() => applyPreset(name)}
              style={chipStyle(activePreset === name)}
            >
              {name}
            </button>
          ))}
          <button type="button" onClick={resetAll} style={chipStyle(false)}>
            Reset
          </button>
        </div>

        <span style={{ flex: 1 }} />

        <Switch
          checked={enabled}
          onChange={(_, next) => toggleEnabled(next)}
          slotProps={{ input: { 'aria-label': 'Enable equalizer' } }}
        />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 20 }}>
        <EqGrid gains={bands} onChange={setBand} dimmed={!enabled} />
        <div style={{ flex: '0 0 32%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <BalancePad fade={fade} balance={balance} onChange={setPad} dimmed={!enabled} />
        </div>
      </div>
    </div>
  )
}
