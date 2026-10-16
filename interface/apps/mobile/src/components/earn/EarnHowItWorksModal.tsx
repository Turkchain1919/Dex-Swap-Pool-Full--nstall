import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { Flex } from '@universe/mycelium'
import { useAppStackNavigation } from 'src/app/navigation/types'
import type { EarnDepositAmountModalState } from 'src/components/earn/EarnDepositAmountModalState'
import { Modal } from 'uniswap/src/components/modals/Modal'
import type { BaseModalProps } from 'uniswap/src/components/modals/ModalProps'
import {
  EarnAnalyticsSurface,
  EarnEntryPoint,
  getEarnVaultAnalyticsProperties,
} from 'uniswap/src/features/earn/analytics'
import { EarnHowItWorksView } from 'uniswap/src/features/earn/EarnHowItWorksView'
import { useAcknowledgeEarnHowItWorks } from 'uniswap/src/features/earn/hooks/useAcknowledgeEarnHowItWorks'
import { isEarnPositionUnknown, useEarnPosition } from 'uniswap/src/features/earn/hooks/useEarnPosition'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { useEvent } from 'utilities/src/react/hooks'
import { useActiveAccountAddress } from 'wallet/src/features/wallet/hooks'

export function EarnHowItWorksModal({
  isOpen,
  onClose,
  ...routeState
}: EarnDepositAmountModalState & BaseModalProps): JSX.Element | null {
  const { analyticsEntryPoint = EarnEntryPoint.GlobalModal, vault, position } = routeState
  const navigation = useAppStackNavigation()
  const walletAddress = useActiveAccountAddress()
  // The route position is only a snapshot hint. Resolve the live position for correct analytics.
  const { position: resolvedPosition, positionStatus } = useEarnPosition({
    vault,
    walletAddress: walletAddress ?? undefined,
    // Signed-out must degrade to NoPosition, not pin Loading (which would hold analytics forever).
    isConnected: walletAddress !== null,
    enabled: isOpen,
    prefetchedPosition: position,
  })
  const isPositionUnknown = isEarnPositionUnknown(positionStatus) && resolvedPosition === undefined

  const continueDeposit = useEvent(() => {
    if (!vault) {
      return
    }

    navigation.replace(ModalName.EarnDepositAmount, {
      ...routeState,
      analyticsEntryPoint,
      vault,
    })
  })
  const analyticsProperties =
    vault && !isPositionUnknown
      ? getEarnVaultAnalyticsProperties({
          entryPoint: analyticsEntryPoint,
          position: resolvedPosition,
          surface: EarnAnalyticsSurface.Mobile,
          vault,
        })
      : undefined
  const handleContinue = useAcknowledgeEarnHowItWorks({
    analyticsProperties,
    onContinue: continueDeposit,
    vaultId: vault?.id,
  })

  if (!vault) {
    return null
  }

  return (
    <Modal overrideInnerContainer name={ModalName.EarnHowItWorks} isModalOpen={isOpen} onClose={onClose}>
      <BottomSheetScrollView showsVerticalScrollIndicator={false}>
        <Flex
          // Opaque $surface1 (matches the sheet surface) makes this an RNGH touch target on Android, so empty-space
          // taps stop here instead of falling through to the dismiss backdrop (CONS-2919).
          backgroundColor="$surface1"
          testID="earn-how-it-works-sheet-content"
        >
          <EarnHowItWorksView analyticsProperties={analyticsProperties} onContinue={handleContinue} />
        </Flex>
      </BottomSheetScrollView>
    </Modal>
  )
}
