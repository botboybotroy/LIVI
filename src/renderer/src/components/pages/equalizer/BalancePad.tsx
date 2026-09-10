import { alpha, useTheme } from '@mui/material/styles'
import { useRef } from 'react'
import { clamp, PAD_RADIUS } from './constants'

type BalancePadProps = {
  /** 0 = full front, 0.5 = centred, 1 = full rear. */
  fade: number
  /** 0 = full left, 0.5 = centred, 1 = full right. */
  balance: number
  onChange: (fade: number, balance: number) => void
  dimmed?: boolean
}

const KEY_STEP = 0.04

/**
 * Placeholder top-view car. Swap the body for the supplied artwork; the dot is
 * positioned in the pad's own coordinates, so it does not depend on this shape.
 */
const CarOutline = ({ color }: { color: string }) => (
  <svg
    viewBox="0 0 120 190"
    fill="none"
    aria-hidden="true"
    style={{ position: 'absolute', inset: '9% 22%', width: '56%', height: '82%', opacity: 0.5 }}
  >
    <rect
      x={22}
      y={10}
      width={76}
      height={170}
      rx={32}
      stroke={color}
      strokeWidth={2}
      opacity={0.7}
    />
    <path d="M34 44 q26 -15 52 0 l-5 24 q-21 -9 -42 0 z" fill={color} opacity={0.28} />
    <path d="M34 146 q26 15 52 0 l-5 -22 q-21 9 -42 0 z" fill={color} opacity={0.28} />
    <rect x={13} y={40} width={9} height={24} rx={3.5} fill={color} opacity={0.6} />
    <rect x={98} y={40} width={9} height={24} rx={3.5} fill={color} opacity={0.6} />
    <rect x={13} y={126} width={9} height={24} rx={3.5} fill={color} opacity={0.6} />
    <rect x={98} y={126} width={9} height={24} rx={3.5} fill={color} opacity={0.6} />
  </svg>
)

export const BalancePad = ({ fade, balance, onChange, dimmed = false }: BalancePadProps) => {
  const theme = useTheme()
  const padRef = useRef<HTMLDivElement | null>(null)

  const accent = theme.palette.primary.main

  const front = Math.round((1 - fade) * 100)
  const left = Math.round((1 - balance) * 100)

  const setFromClient = (clientX: number, clientY: number): void => {
    const pad = padRef.current
    if (!pad) return
    const rect = pad.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    // Clamp to an inset ellipse so the dot stays over the car body.
    let ex = ((clientX - rect.left) / rect.width - 0.5) / PAD_RADIUS
    let ey = ((clientY - rect.top) / rect.height - 0.5) / PAD_RADIUS
    const mag = Math.hypot(ex, ey)
    if (mag > 1) {
      ex /= mag
      ey /= mag
    }
    onChange(0.5 + ey * PAD_RADIUS, 0.5 + ex * PAD_RADIUS)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    let nextFade = fade
    let nextBalance = balance
    if (e.key === 'ArrowLeft') nextBalance -= KEY_STEP
    else if (e.key === 'ArrowRight') nextBalance += KEY_STEP
    else if (e.key === 'ArrowUp') nextFade -= KEY_STEP
    else if (e.key === 'ArrowDown') nextFade += KEY_STEP
    else return
    e.preventDefault()
    const lo = 0.5 - PAD_RADIUS
    const hi = 0.5 + PAD_RADIUS
    onChange(clamp(nextFade, lo, hi), clamp(nextBalance, lo, hi))
  }

  const cornerLabel: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 11,
    letterSpacing: '0.08em',
    color: theme.palette.text.secondary,
    pointerEvents: 'none'
  }

  return (
    <div
      style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}
    >
      <div
        ref={padRef}
        tabIndex={0}
        role="application"
        aria-label="Speaker balance and fade"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setFromClient(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
          setFromClient(e.clientX, e.clientY)
        }}
        onKeyDown={onKeyDown}
        style={{
          position: 'relative',
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'hidden',
          borderRadius: 12,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.text.primary, 0.04),
          touchAction: 'none',
          cursor: 'grab',
          outline: 'none',
          opacity: dimmed ? 0.4 : 1,
          transition: 'opacity 140ms ease-out'
        }}
      >
        <CarOutline color={theme.palette.text.secondary} />

        <span style={{ ...cornerLabel, top: 6 }}>FRONT</span>
        <span style={{ ...cornerLabel, bottom: 6 }}>REAR</span>

        <div
          style={{
            position: 'absolute',
            left: '8%',
            right: '8%',
            top: `${fade * 100}%`,
            height: 1,
            backgroundColor: theme.palette.divider
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '8%',
            bottom: '8%',
            left: `${balance * 100}%`,
            width: 1,
            backgroundColor: theme.palette.divider
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${balance * 100}%`,
            top: `${fade * 100}%`,
            width: 30,
            height: 30,
            borderRadius: '50%',
            backgroundColor: accent,
            border: `3px solid ${theme.palette.background.default}`,
            boxShadow: `0 0 0 1px ${accent}, 0 0 18px -2px ${accent}`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      </div>

      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          fontSize: 12,
          color: theme.palette.text.secondary
        }}
      >
        <span>
          Fade{' '}
          <b style={{ color: theme.palette.text.primary, fontWeight: 500 }}>
            F{front} R{100 - front}
          </b>
        </span>
        <span>
          Balance{' '}
          <b style={{ color: theme.palette.text.primary, fontWeight: 500 }}>
            L{left} R{100 - left}
          </b>
        </span>
      </div>
    </div>
  )
}
