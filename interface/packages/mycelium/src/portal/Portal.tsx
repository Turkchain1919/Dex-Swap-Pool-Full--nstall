/**
 * Platform-split base stub — bundlers resolve `Portal.web` / `Portal.native`
 * (the `ui/src` convention). Reaching this module means the platform override
 * did not resolve, which is a bundler-configuration defect rather than an
 * expected failure.
 */
import { PlatformSplitStubError } from '@universe/environment'
import type { JSX } from 'react'
import type { PortalProps, PortalProviderProps } from './PortalProps'

export function PortalProvider(_props: PortalProviderProps): JSX.Element {
  throw new PlatformSplitStubError('PortalProvider')
}

export function Portal(_props: PortalProps): JSX.Element | null {
  throw new PlatformSplitStubError('Portal')
}
