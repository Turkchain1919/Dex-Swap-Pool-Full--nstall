import { PropsWithChildren } from 'react'
import { PlatformSplitStubError } from 'utilities/src/errors'

export type NftViewLongPressAreaProps = PropsWithChildren<{
  onPress: () => void
  /** Native-only: web ignores this — the web context menu opens via ContextMenu's click trigger, not long press. */
  onLongPress?: () => void
  testID?: string
}>

/** Press/long-press trigger for the NFT grid context menu. Implementations in .native.tsx / .web.tsx. */
export function NftViewLongPressArea(_props: NftViewLongPressAreaProps): JSX.Element {
  throw new PlatformSplitStubError('NftViewLongPressArea')
}
