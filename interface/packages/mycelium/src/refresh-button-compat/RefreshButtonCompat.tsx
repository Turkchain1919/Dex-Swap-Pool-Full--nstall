import type { JSX } from 'react'
import { PlatformSplitStubError } from 'utilities/src/errors'
import type { RefreshButtonCompatProps } from './props'

/**
 * Platformless base stub for the RefreshButton compat (INFRA-3489) — bundlers
 * resolve the real web implementation (`RefreshButtonCompat.web.tsx`) or the
 * deliberate native stub (`RefreshButtonCompat.native.tsx`) via their
 * platform extension order (the `Shimmer` mechanism, per
 * `packages/mycelium/CLAUDE.md`).
 *
 * @throws always — reaching this module means the platform override did not
 * resolve (defect in bundler configuration, not an expected failure).
 */
export function RefreshButtonCompat(_props: RefreshButtonCompatProps): JSX.Element {
  throw new PlatformSplitStubError('RefreshButtonCompat')
}
