import { PlatformSplitStubError } from 'utilities/src/errors'

export interface RefreshButtonProps {
  onPress: () => void
  isLoading: boolean
  /** Blocks both the press handler and the `R` keyboard shortcut. */
  disabled?: boolean
}

// TODO(CONS-698): Replace other refresh icons with this component
export function RefreshButton(_props: RefreshButtonProps): JSX.Element {
  throw new PlatformSplitStubError('RefreshButton')
}
