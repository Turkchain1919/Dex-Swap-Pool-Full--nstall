/**
 * Compat twin of `ui/src/styles/ScrollbarStyles.tsx` (same CSSProperties shape
 * and values, per active theme; pinned by
 * packages/tailwind/src/parity/theme-hooks/scrollbar-styles.test.tsx).
 *
 * Single non-split file, matching the legacy hook: the platform split lives
 * inside the compat `useSporeColors` it leans on, and the returned WebKit
 * scrollbar keys are inert on native exactly as the legacy hook's are.
 */
import type { CSSProperties } from 'react'
import { useSporeColors } from './useSporeColors'

export function useScrollbarStyles(): CSSProperties {
  const colors = useSporeColors()
  return {
    '&::WebkitScrollbar': {
      backgroundColor: 'transparent',
    },
    '&::WebkitScrollbarThumb': {
      backgroundColor: colors.surface3.val,
      borderRadius: '8px',
    },
    scrollbarWidth: 'thin',
    scrollbarColor: `${colors.surface3.val} transparent`,
    overscrollBehavior: 'contain',
  } as CSSProperties
}
