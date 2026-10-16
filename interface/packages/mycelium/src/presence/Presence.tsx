import type { JSX } from 'react'
import type { PresenceProps } from './PresenceProps'

/**
 * Platformless base stub for the `Presence` primitive — bundlers resolve the
 * real implementation (`Presence.web.tsx`) via their platform extension
 * order.
 *
 * @throws always — reaching this module means the platform override did not
 * resolve (defect in bundler configuration, not an expected failure).
 */
export function Presence<TCustom = unknown>(_props: PresenceProps<TCustom>): JSX.Element {
  throw new Error('Presence not implemented. Did you forget a platform override?')
}
