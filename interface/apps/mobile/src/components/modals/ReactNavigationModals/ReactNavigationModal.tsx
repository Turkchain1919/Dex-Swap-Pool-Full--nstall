import { PasskeyManagementModal } from '@universe/embedded-wallet'
import { type ComponentProps, type ComponentType, memo } from 'react'
import type { AppStackParamList, AppStackScreenProp } from 'src/app/navigation/types'
import { EarnDepositAmountModal } from 'src/components/earn/EarnDepositAmountModal'
import { EarnDepositReviewModal } from 'src/components/earn/EarnDepositReviewModal'
import { EarnDepositSourceSelectorModal } from 'src/components/earn/EarnDepositSourceSelectorModal'
import { EarnHowItWorksModal } from 'src/components/earn/EarnHowItWorksModal'
import { EarnVaultModal } from 'src/components/earn/EarnVaultModal'
import { EarnWithdrawNetworkSelectorModal } from 'src/components/earn/EarnWithdrawNetworkSelectorModal'
import { EarnWithdrawReviewModal } from 'src/components/earn/EarnWithdrawReviewModal'
import { EarnYouNeedTokenModal } from 'src/components/earn/EarnYouNeedTokenModal'
import { useReactNavigationModal } from 'src/components/modals/useReactNavigationModal'
import { BridgedAssetModal } from 'uniswap/src/components/BridgedAsset/BridgedAssetModal'
import { WormholeModal } from 'uniswap/src/components/BridgedAsset/WormholeModal'
import { ReportPortfolioDataModal } from 'uniswap/src/components/reporting/ReportPortfolioDataModal'
import { ReportTokenDataModal } from 'uniswap/src/components/reporting/ReportTokenDataModal'
import { ReportTokenIssueModal } from 'uniswap/src/components/reporting/ReportTokenIssueModal'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { TestnetModeModal } from 'uniswap/src/features/testnets/TestnetModeModal'
import { HiddenTokenInfoModal } from 'uniswap/src/features/transactions/modals/HiddenTokenInfoModal'
import { AboutModal } from 'wallet/src/components/settings/about/AboutModal'
import { PermissionsModal } from 'wallet/src/components/settings/permissions/PermissionsModal'
import { PortfolioBalanceModal } from 'wallet/src/components/settings/portfolioBalance/PortfolioBalanceModal'
import { SmartWalletAdvancedSettingsModal } from 'wallet/src/components/smartWallet/modals/SmartWalletAdvancedSettingsModal'
import { SmartWalletEnabledModal } from 'wallet/src/components/smartWallet/modals/SmartWalletEnabledModal'
import { SmartWalletNudge } from 'wallet/src/components/smartWallet/modals/SmartWalletNudge'

// Define names of shared modals we're explicitly supporting on mobile
type ValidModalNames = keyof Pick<
  AppStackParamList,
  | typeof ModalName.TestnetMode
  | typeof ModalName.HiddenTokenInfoModal
  | typeof ModalName.PasskeyManagement
  | typeof ModalName.SmartWalletAdvancedSettingsModal
  | typeof ModalName.SmartWalletEnabledModal
  | typeof ModalName.SmartWalletNudge
  | typeof ModalName.PermissionsModal
  | typeof ModalName.PortfolioBalanceModal
  | typeof ModalName.About
  | typeof ModalName.BridgedAsset
  | typeof ModalName.Wormhole
  | typeof ModalName.ReportPortfolioData
  | typeof ModalName.ReportTokenIssue
  | typeof ModalName.ReportTokenData
  | typeof ModalName.EarnDepositAmount
  | typeof ModalName.EarnDepositReview
  | typeof ModalName.EarnDepositSourceSelector
  | typeof ModalName.EarnHowItWorks
  | typeof ModalName.EarnVault
  | typeof ModalName.EarnWithdrawNetworkSelector
  | typeof ModalName.EarnWithdrawReview
  | typeof ModalName.EarnYouNeedToken
>

type ModalNameWithComponentProps = {
  [ModalName.TestnetMode]: ComponentProps<typeof TestnetModeModal>
  [ModalName.HiddenTokenInfoModal]: ComponentProps<typeof HiddenTokenInfoModal>
  [ModalName.PasskeyManagement]: ComponentProps<typeof PasskeyManagementModal>
  [ModalName.SmartWalletNudge]: ComponentProps<typeof SmartWalletNudge>
  [ModalName.SmartWalletAdvancedSettingsModal]: ComponentProps<typeof SmartWalletAdvancedSettingsModal>
  [ModalName.SmartWalletEnabledModal]: ComponentProps<typeof SmartWalletEnabledModal>
  [ModalName.PermissionsModal]: ComponentProps<typeof PermissionsModal>
  [ModalName.PortfolioBalanceModal]: ComponentProps<typeof PortfolioBalanceModal>
  [ModalName.About]: ComponentProps<typeof AboutModal>
  [ModalName.BridgedAsset]: ComponentProps<typeof BridgedAssetModal>
  [ModalName.Wormhole]: ComponentProps<typeof WormholeModal>
  [ModalName.ReportPortfolioData]: ComponentProps<typeof ReportPortfolioDataModal>
  [ModalName.ReportTokenIssue]: ComponentProps<typeof ReportTokenIssueModal>
  [ModalName.ReportTokenData]: ComponentProps<typeof ReportTokenDataModal>
  [ModalName.EarnDepositAmount]: ComponentProps<typeof EarnDepositAmountModal>
  [ModalName.EarnDepositReview]: ComponentProps<typeof EarnDepositReviewModal>
  [ModalName.EarnDepositSourceSelector]: ComponentProps<typeof EarnDepositSourceSelectorModal>
  [ModalName.EarnHowItWorks]: ComponentProps<typeof EarnHowItWorksModal>
  [ModalName.EarnVault]: ComponentProps<typeof EarnVaultModal>
  [ModalName.EarnWithdrawNetworkSelector]: ComponentProps<typeof EarnWithdrawNetworkSelectorModal>
  [ModalName.EarnWithdrawReview]: ComponentProps<typeof EarnWithdrawReviewModal>
  [ModalName.EarnYouNeedToken]: ComponentProps<typeof EarnYouNeedTokenModal>
}

type NavigationModalProps<ModalName extends ValidModalNames> = {
  modalComponent: ComponentType<ModalNameWithComponentProps[ModalName]>
  route: AppStackScreenProp<ModalName>['route']
}

/**
 * A generic wrapper component that adapts a shared modal to work with React Navigation.
 */
function ReactNavigationModalInner<ModalName extends ValidModalNames>({
  modalComponent: ModalComponent,
  route,
}: NavigationModalProps<ModalName>): JSX.Element {
  const { onClose } = useReactNavigationModal()
  const params = (route.params ?? {}) as NonNullable<typeof route.params>

  return <ModalComponent {...params} isOpen onClose={onClose} />
}

export const ReactNavigationModal = memo(ReactNavigationModalInner)
