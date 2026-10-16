/**
 * Platformless base stub for `ButtonTextCompat` — see `ButtonFrameCompat.tsx`
 * for the pattern (three-file split, web types as the tsc surface).
 *
 * @throws always — reaching this module means the platform override did not
 * resolve (a bundler-configuration defect, not an expected failure).
 */
import { forwardRef, type JSX } from 'react'
import type { ButtonTextCompatProps } from './text-props'

export type { ButtonTextCompatProps } from './text-props'

const ButtonTextComponent = forwardRef<HTMLSpanElement, ButtonTextCompatProps>(
  function ButtonTextCompat(): JSX.Element {
    throw new Error('ButtonTextCompat not implemented. Did you forget a platform override?')
  },
)

export const ButtonTextCompat = ButtonTextComponent
