import { PlatformSplitStubError } from 'utilities/src/errors'

export interface MaybeExplorerLinkedAddressProps {
  address: string
  link: Maybe<string>
}

/**
 * Shortened address that links out to a block explorer when a link is available.
 * Web/extension render a real anchor; native opens the link via `openUri` on tap.
 */
export function MaybeExplorerLinkedAddress(_: MaybeExplorerLinkedAddressProps): JSX.Element {
  throw new PlatformSplitStubError('MaybeExplorerLinkedAddress')
}
