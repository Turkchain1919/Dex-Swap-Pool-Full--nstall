import { Flex, Text } from '@universe/mycelium'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStackNavigation } from 'src/app/navigation/types'
import { TokenDetailsEarnSection as SharedTokenDetailsEarnSection } from 'uniswap/src/components/tokenDetails/TokenDetailsEarnSection'
import { EarnEntryPoint } from 'uniswap/src/features/earn/analytics'
import { EarnBalanceErrorState } from 'uniswap/src/features/earn/EarnBalanceErrorState'
import { useEarnDepositSources } from 'uniswap/src/features/earn/hooks/useEarnDepositSources'
import { useEarnPosition } from 'uniswap/src/features/earn/hooks/useEarnPosition'
import type { TokenDetailsEarnData } from 'uniswap/src/features/earn/hooks/useTokenDetailsEarnData'
import { EarnAction, type EarnPositionInfo, type EarnVaultInfo } from 'uniswap/src/features/earn/types'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { useWalletNavigation } from 'wallet/src/contexts/WalletNavigationContext'
import { useIsViewOnlyWallet } from 'wallet/src/features/wallet/hooks'

type TokenDetailsEarnSectionProps = {
  activeAddress: Address | undefined
  earnData: TokenDetailsEarnData
}

export const TokenDetailsEarnSection = memo(function TokenDetailsEarnSectionInner({
  activeAddress,
  earnData,
}: TokenDetailsEarnSectionProps): JSX.Element | null {
  const { t } = useTranslation()
  const navigation = useAppStackNavigation()
  const { navigateToEarnVault } = useWalletNavigation()
  const isViewOnlyWallet = useIsViewOnlyWallet()

  const isSectionVisible = !!earnData.earnVault && !!earnData.earnPosition && earnData.userHasEarnPosition

  const { position: detailedPosition, isError: positionIsError } = useEarnPosition({
    vault: earnData.earnVault,
    walletAddress: activeAddress,
    isConnected: !!activeAddress,
    enabled: isSectionVisible,
    prefetchedPosition: earnData.earnPosition,
  })

  const { balanceLookupSettled, hasSupportedBalanceForUnderlying } = useEarnDepositSources({
    vault: earnData.earnVault,
    walletAddress: activeAddress,
    // View-only wallets route straight to the vault overview, so the lookup is unused.
    isOpen: isSectionVisible && !isViewOnlyWallet,
  })

  const handleDepositPress = useCallback(
    (vault: EarnVaultInfo, position: EarnPositionInfo): void => {
      // View-only wallets stop at the vault overview. Must return before the settled guard
      // below: their sources lookup is disabled (isOpen above), so it never settles.
      if (isViewOnlyWallet) {
        navigateToEarnVault({
          analyticsEntryPoint: EarnEntryPoint.TokenDetailsEarnSection,
          vault,
          position,
        })
        return
      }

      if (!balanceLookupSettled) {
        return
      }

      if (!hasSupportedBalanceForUnderlying) {
        navigation.navigate(ModalName.EarnYouNeedToken, {
          currencyId: vault.displayCurrencyId,
        })
        return
      }

      navigateToEarnVault({
        analyticsEntryPoint: EarnEntryPoint.TokenDetailsEarnSection,
        vault,
        position,
        initialAction: EarnAction.Deposit,
      })
    },
    [balanceLookupSettled, hasSupportedBalanceForUnderlying, isViewOnlyWallet, navigation, navigateToEarnVault],
  )

  if (earnData.showEarnError) {
    return (
      <Flex gap="$spacing8" width="100%">
        <Text variant="subheading2" color="$neutral1">
          {t('home.earning.title')}
        </Text>
        <EarnBalanceErrorState onRetry={earnData.refetch} />
      </Flex>
    )
  }

  if (!isSectionVisible || !earnData.earnVault || !detailedPosition) {
    return null
  }

  return (
    <SharedTokenDetailsEarnSection
      mobileLayout
      earnVault={earnData.earnVault}
      earnPosition={detailedPosition}
      rewardsUnavailable={positionIsError && detailedPosition.lifetimePnlUsd === undefined}
      onPositionPress={(vault, position) =>
        navigateToEarnVault({ analyticsEntryPoint: EarnEntryPoint.TokenDetailsEarnSection, vault, position })
      }
      onWithdrawPress={(vault, position) =>
        navigateToEarnVault({
          analyticsEntryPoint: EarnEntryPoint.TokenDetailsEarnSection,
          vault,
          position,
          initialAction: EarnAction.Withdraw,
        })
      }
      onDepositPress={handleDepositPress}
    />
  )
})
