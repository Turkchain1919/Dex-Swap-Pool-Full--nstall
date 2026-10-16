import React, { useMemo } from 'react'
import { cn } from '../cn'
import { deriveUnicon, resolveUniconInput, uniconGeometry } from './derive'
import type { UniconProps } from './types'

/**
 * Deterministic avatar component that generates a unique visual identity
 * based on any input string (e.g., wallet address, username, email).
 * `address` is a legacy-named alias for `input` — pass exactly one.
 *
 * Colors automatically adapt to light/dark mode via CSS variables.
 *
 * @example
 * ```tsx
 * <Unicon input="0x1234..." size={48} />
 * <Unicon address="0x1234..." size={48} />
 * <Unicon input="user@example.com" size={32} className="border border-neutral1" />
 * ```
 */
export function Unicon(props: UniconProps): React.ReactElement {
  const { size = 32, className, icon, bare } = props
  const input = resolveUniconInput(props)
  const { colorVar, paths } = useMemo(() => {
    const { colorIndex, paths: derivedPaths } = deriveUnicon(input)
    return {
      colorVar: `var(--unicon-${colorIndex})`,
      paths: derivedPaths,
    }
  }, [input])

  const { scale, translate, iconSize, iconOffset } = uniconGeometry({ size, bare })

  return (
    <svg
      width={size}
      height={size}
      style={{ width: size, height: size }}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
    >
      {!bare && <circle cx={size / 2} cy={size / 2} r={size / 2} fill={colorVar} opacity="var(--unicon-bg-opacity)" />}
      {icon ? (
        <foreignObject x={iconOffset} y={iconOffset} width={iconSize} height={iconSize}>
          {/* oxlint-disable-next-line react/forbid-elements -- div required inside SVG foreignObject */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colorVar,
            }}
          >
            {icon}
          </div>
        </foreignObject>
      ) : (
        <g transform={`translate(${translate}, ${translate}) scale(${scale})`}>
          {paths.map((d, i) => (
            <path key={i} d={d} fill={colorVar} clipRule="evenodd" fillRule="evenodd" />
          ))}
        </g>
      )}
    </svg>
  )
}
