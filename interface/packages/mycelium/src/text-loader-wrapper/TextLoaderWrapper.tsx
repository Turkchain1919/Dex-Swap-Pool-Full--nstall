import type { JSX } from 'react'
import type { TextLoaderWrapperProps } from './TextLoaderWrapperProps'

/**
 * Platformless base stub for the `TextLoaderWrapper` primitive — bundlers
 * resolve the real implementation (`TextLoaderWrapper.web.tsx` /
 * `TextLoaderWrapper.native.tsx`) via their platform extension order.
 *
 * @throws always — reaching this module means the platform override did not
 * resolve (defect in bundler configuration, not an expected failure).
 */
export function TextLoaderWrapper(_props: TextLoaderWrapperProps): JSX.Element {
  throw new Error('TextLoaderWrapper not implemented. Did you forget a platform override?')
}
