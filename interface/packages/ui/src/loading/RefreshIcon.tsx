import { IconProps } from 'ui/src/components/factories/createIcon'
import { PlatformSplitStubError } from 'utilities/src/errors'

export function RefreshIcon(_props: IconProps & { isAnimating?: boolean }): JSX.Element {
  throw new PlatformSplitStubError('RefreshIcon')
}
