import { alpha, useTheme } from '@mui/material/styles'
import { useCallback, useRef } from 'react'
import { useElementSize } from '../media/hooks/useElementSize'
import {
  clamp,
  EQ_FREQUENCIES,
  EQ_GRID_DB,
  EQ_KEY_STEP_DB,
  EQ_MAX_DB,
  EQ_MIN_DB,
  EQ_PAGE_STEP_DB,
  EQ_STEP_DB,
  formatDb,
  formatHz
} from './constants'

type EqGridProps = {
  gains: number[]
  onChange: (index: number, db: number) => void
  dimmed?: boolean
}

// Plot insets, in px. The bottom strip carries the frequency and gain rows.
const INSET_LEFT = 46
const INSET_RIGHT = 10
const INSET_TOP = 14
const INSET_BOTTOM = 46

type Point = { x: number; y: number }

/** A Catmull-Rom spline through the points, as a cubic bezier path. */
function splinePath(points: Point[]): string {
  if (points.length === 0) return ''
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d +=
      ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)},` +
      ` ${c2x.toFixed(1)} ${c2y.toFixed(1)},` +
      ` ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

export const EqGrid = ({ gains, onChange, dimmed = false }: EqGridProps) => {
  const theme = useTheme()
  const [hostRef, { w, h }] = useElementSize<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement | null>(null)

  const accent = theme.palette.primary.main
  const gridColor = alpha(theme.palette.text.primary, 0.09)
  const gridColorFaint = alpha(theme.palette.text.primary, 0.06)
  const zeroColor = alpha(theme.palette.text.primary, 0.24)

  const left = INSET_LEFT
  const right = Math.max(left + 1, w - INSET_RIGHT)
  const top = INSET_TOP
  const bottom = Math.max(top + 1, h - INSET_BOTTOM)
  const zeroY = (top + bottom) / 2
  const span = (bottom - top) / 2
  const colWidth = (right - left) / EQ_FREQUENCIES.length

  const xFor = (index: number): number => left + colWidth * (index + 0.5)
  const yFor = (db: number): number => zeroY - (db / EQ_MAX_DB) * span

  const gainFromClientY = useCallback(
    (clientY: number): number => {
      const svg = svgRef.current
      if (!svg) return 0
      const rect = svg.getBoundingClientRect()
      if (rect.height <= 0) return 0
      const y = ((clientY - rect.top) / rect.height) * h
      const raw = ((zeroY - y) / span) * EQ_MAX_DB
      const stepped = Math.round(raw / EQ_STEP_DB) * EQ_STEP_DB
      return clamp(stepped, EQ_MIN_DB, EQ_MAX_DB)
    },
    [h, span, zeroY]
  )

  const handlePointerDown = (index: number) => (e: React.PointerEvent<SVGElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    onChange(index, gainFromClientY(e.clientY))
  }

  const handlePointerMove = (index: number) => (e: React.PointerEvent<SVGElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    onChange(index, gainFromClientY(e.clientY))
  }

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<SVGGElement>) => {
    let delta = 0
    if (e.key === 'ArrowUp') delta = EQ_KEY_STEP_DB
    else if (e.key === 'ArrowDown') delta = -EQ_KEY_STEP_DB
    else if (e.key === 'PageUp') delta = EQ_PAGE_STEP_DB
    else if (e.key === 'PageDown') delta = -EQ_PAGE_STEP_DB
    else if (e.key === 'Home') return onChange(index, EQ_MAX_DB)
    else if (e.key === 'End') return onChange(index, EQ_MIN_DB)
    else return
    e.preventDefault()
    onChange(index, clamp(gains[index] + delta, EQ_MIN_DB, EQ_MAX_DB))
  }

  const ready = w > INSET_LEFT + INSET_RIGHT + 40 && h > INSET_TOP + INSET_BOTTOM + 40

  const curvePoints: Point[] = ready
    ? [
        { x: left, y: yFor(gains[0]) },
        ...gains.map((db, i) => ({ x: xFor(i), y: yFor(db) })),
        { x: right, y: yFor(gains[gains.length - 1]) }
      ]
    : []
  const curve = splinePath(curvePoints)
  const area = curve
    ? `${curve} L ${right.toFixed(1)} ${zeroY.toFixed(1)} L ${left.toFixed(1)} ${zeroY.toFixed(1)} Z`
    : ''

  return (
    <div
      ref={hostRef}
      style={{
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        borderRadius: 10,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.text.primary, 0.04),
        padding: '10px 12px',
        opacity: dimmed ? 0.4 : 1,
        transition: 'opacity 140ms ease-out'
      }}
    >
      {ready && (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height="100%"
          style={{ display: 'block', overflow: 'visible', touchAction: 'none' }}
        >
          <title>Equalizer response</title>

          {EQ_GRID_DB.map((db) => (
            <g key={`db-${db}`}>
              <line
                x1={left}
                y1={yFor(db)}
                x2={right}
                y2={yFor(db)}
                stroke={db === 0 ? zeroColor : gridColor}
                strokeWidth={1}
              />
              <text
                x={left - 10}
                y={yFor(db) + 4}
                textAnchor="end"
                fontSize={13}
                fill={theme.palette.text.secondary}
              >
                {db > 0 ? `+${db}` : db}
              </text>
            </g>
          ))}
          <text
            x={left - 10}
            y={top - 2}
            textAnchor="end"
            fontSize={10}
            fill={theme.palette.text.secondary}
            opacity={0.7}
          >
            dB
          </text>

          {EQ_FREQUENCIES.map((hz, i) => (
            <line
              key={`v-${hz}`}
              x1={xFor(i)}
              y1={top}
              x2={xFor(i)}
              y2={bottom}
              stroke={gridColorFaint}
              strokeWidth={1}
            />
          ))}

          <path d={area} fill={accent} opacity={0.13} />
          <path
            d={curve}
            fill="none"
            stroke={accent}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {EQ_FREQUENCIES.map((hz, i) => {
            const db = gains[i]
            const x = xFor(i)
            const y = yFor(db)
            return (
              <g key={`band-${hz}`}>
                <text
                  x={x}
                  y={bottom + 22}
                  textAnchor="middle"
                  fontSize={13}
                  fill={theme.palette.text.secondary}
                >
                  {formatHz(hz)}
                </text>
                <text
                  x={x}
                  y={bottom + 40}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={600}
                  fill={db === 0 ? theme.palette.text.secondary : accent}
                >
                  {formatDb(db)}
                </text>

                <rect
                  x={left + colWidth * i}
                  y={top - 8}
                  width={colWidth}
                  height={bottom - top + 16}
                  fill="transparent"
                  style={{ cursor: 'ns-resize' }}
                  onPointerDown={handlePointerDown(i)}
                  onPointerMove={handlePointerMove(i)}
                />

                <g
                  tabIndex={0}
                  role="slider"
                  aria-label={`${formatHz(hz)} hertz`}
                  aria-valuemin={EQ_MIN_DB}
                  aria-valuemax={EQ_MAX_DB}
                  aria-valuenow={db}
                  aria-valuetext={`${formatDb(db)} decibels`}
                  onKeyDown={handleKeyDown(i)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={8}
                    fill={accent}
                    stroke={theme.palette.background.default}
                    strokeWidth={2.5}
                    onPointerDown={handlePointerDown(i)}
                    onPointerMove={handlePointerMove(i)}
                  />
                  {db !== 0 && (
                    <text
                      x={x}
                      y={db >= 0 ? y - 15 : y + 22}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill={theme.palette.text.primary}
                      style={{ pointerEvents: 'none' }}
                    >
                      {formatDb(db)}
                    </text>
                  )}
                </g>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
