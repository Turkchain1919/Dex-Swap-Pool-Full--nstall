import type { ReactNode } from 'react'
import { PlatformSplitStubError } from 'utilities/src/errors'

export type PortalProps = {
  children?: ReactNode
  /** Explicit stacking value for the full-window portal wrapper. Takes precedence over `stackZIndex`. */
  zIndex?: number
  /**
   * Lifts this portal above sibling portals, mirroring how call sites passed a numeric
   * `stackZIndex` to Tamagui's Portal. Portals without either prop stack by mount order.
   */
  stackZIndex?: number
}

/**
 * Full-window overlay portal. Native renders through `@rn-primitives/portal` into the
 * `AppPortalHost` at the app root; web still renders through Tamagui's body-level portal.
 */
export function Portal(_props: PortalProps): JSX.Element {
  throw new PlatformSplitStubError('Portal')
}
