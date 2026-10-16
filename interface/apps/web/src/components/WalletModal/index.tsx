import { Platform } from '@universe/chains'
import { FeatureFlags, useFeatureFlag } from '@universe/gating'
import { MenuStateVariant, useSetMenuCallback } from '~/components/AccountDrawer/menuState'
import { EmbeddedWalletConnectionsModal } from '~/components/WalletModal/EmbeddedWalletModal'
import { StandardWalletModal } from '~/components/WalletModal/StandardWalletModal'
import { SwitchWalletModal } from '~/components/WalletModal/SwitchWalletModal'

export function WalletModal({ connectOnPlatform }: { connectOnPlatform?: Platform | 'any' }) {
  const isEmbeddedWalletEnabled = useFeatureFlag(FeatureFlags.EmbeddedWallet)
  const onClose = useSetMenuCallback(MenuStateVariant.MAIN)

  if (connectOnPlatform) {
    return <SwitchWalletModal connectOnPlatform={connectOnPlatform} onClose={onClose} />
  }

  return isEmbeddedWalletEnabled ? <EmbeddedWalletConnectionsModal /> : <StandardWalletModal />
}
