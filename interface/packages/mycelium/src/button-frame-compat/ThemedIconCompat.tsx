/**
 * Platformless base stubs for `ThemedIconCompat` / `ThemedSpinnerCompat` —
 * see `ButtonFrameCompat.tsx` for the pattern (three-file split, web types as
 * the tsc surface).
 *
 * @throws always — reaching these means the platform override did not resolve
 * (a bundler-configuration defect, not an expected failure).
 */
import type { JSX } from 'react'
import type { ThemedIconCompatProps, ThemedSpinnerCompatProps } from './themed-icon-props'

export type { ThemedIconCompatProps, ThemedSpinnerCompatProps } from './themed-icon-props'

export function ThemedIconCompat(_props: ThemedIconCompatProps): JSX.Element | null {
  throw new Error('ThemedIconCompat not implemented. Did you forget a platform override?')
}

export function ThemedSpinnerCompat(_props: ThemedSpinnerCompatProps): JSX.Element {
  throw new Error('ThemedSpinnerCompat not implemented. Did you forget a platform override?')
}
