import type { PropsWithChildren } from 'react'
import type { QRCodeDisplayProps } from 'ui/src/components/QRCode/types'
import { PlatformSplitStubError } from 'utilities/src/errors'

export function QRCodeDisplay(_props: PropsWithChildren<QRCodeDisplayProps>): JSX.Element {
  throw new PlatformSplitStubError('QRCodeDisplay')
}
