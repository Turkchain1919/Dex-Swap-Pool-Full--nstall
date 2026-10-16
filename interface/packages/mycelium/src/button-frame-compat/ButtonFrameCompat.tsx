/**
 * Platformless base stub for `ButtonFrameCompat` — bundlers resolve the real
 * implementation (`ButtonFrameCompat.web.tsx` / `ButtonFrameCompat.native.tsx`)
 * via their platform extension order (the ButtonCompat/Shimmer pattern; the
 * three-file split is required by dangerfile `checkSplitFiles()`).
 *
 * The public TYPE surface re-exports the web contract: `tsc` has no
 * platform-extension resolution, so this module is what every consumer
 * typechecks against. The native leg declares its RN handler divergences in
 * `./native-props`.
 *
 * @throws always — reaching this module means the platform override did not
 * resolve (a bundler-configuration defect, not an expected failure).
 */
import { forwardRef, type JSX } from 'react'
import type { ButtonFrameCompatProps } from './props'

export type { ButtonFrameCompatProps } from './props'

const ButtonFrameComponent = forwardRef<HTMLElement, ButtonFrameCompatProps>(function ButtonFrameCompat(): JSX.Element {
  throw new Error('ButtonFrameCompat not implemented. Did you forget a platform override?')
})

export const ButtonFrameCompat = ButtonFrameComponent
