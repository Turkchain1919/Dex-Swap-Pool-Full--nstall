import type { CSSProperties } from 'react'
import { CircleSpinner, EmptySpinner } from 'ui/src/components/icons'
import { SpinningLoaderProps } from 'ui/src/loading/types'
import { useInjectSingleStylesheet } from 'utilities/src/react/useInjectSingleStylesheet'

const CSS_RULE_ID = '__spinning_loader_styles__'
const SPINNING_LOADER_CSS = `
  @keyframes rotate360 {
      from {
          transform: rotate(0deg);
      }
      to {
          transform: rotate(360deg);
      }
  }

  .RotateElement {
      animation: rotate360 1s cubic-bezier(0.83, 0, 0.17, 1) infinite;
      transform-origin: center center;
  }
`

/**
 * The layout-consequential declarations the replaced Tamagui Flex hosts carried (its
 * react-native-web-derived view reset), pinned by SpinningLoader.parity.web.test.tsx.
 */
const FLEX_RESET: CSSProperties = {
  alignItems: 'stretch',
  boxSizing: 'border-box',
  display: 'flex',
  flexBasis: 'auto',
  flexDirection: 'column',
  flexShrink: 0,
  minHeight: 0,
  minWidth: 0,
  position: 'relative',
}

export function SpinningLoader({ size = 20, disabled, color, unstyled }: SpinningLoaderProps): JSX.Element {
  useInjectSingleStylesheet({ id: CSS_RULE_ID, css: SPINNING_LOADER_CSS, active: !disabled })

  if (disabled) {
    return <EmptySpinner color="$neutral3" size={size} />
  }

  if (unstyled) {
    return (
      // oxlint-disable-next-line react/forbid-elements -- rebuilt lane: plain div hosts, no Tamagui Flex
      <div className="RotateElement" style={FLEX_RESET}>
        <CircleSpinner color={color} size={size} />
      </div>
    )
  }

  return (
    // oxlint-disable-next-line react/forbid-elements -- rebuilt lane: plain div hosts, no Tamagui Flex
    <div
      style={{
        ...FLEX_RESET,
        alignItems: 'center',
        height: size,
        justifyContent: 'center',
        // The legacy host set the logical marginStart/marginEnd pair; both sides are 2 so the
        // physical properties are direction-independent here.
        marginLeft: 2,
        marginRight: 2,
        width: size,
      }}
    >
      {/* oxlint-disable-next-line react/forbid-elements -- rebuilt lane: plain div hosts, no Tamagui Flex */}
      <div style={{ ...FLEX_RESET, height: size, minHeight: 8, minWidth: 8, padding: 1.66667, width: size }}>
        {/* oxlint-disable-next-line react/forbid-elements -- rebuilt lane: plain div hosts, no Tamagui Flex */}
        <div className="RotateElement" style={{ ...FLEX_RESET, position: 'absolute' }}>
          <CircleSpinner color={color} size={size} />
        </div>
      </div>
    </div>
  )
}
