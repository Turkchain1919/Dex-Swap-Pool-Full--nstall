import { UniverseChainId, isSVMChain } from '@universe/chains'
import { Flex, Text, type TextCompatProps } from '@universe/mycelium'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TokenDetailsPoolsTable } from '~/pages/TokenDetails/components/activity/TokenDetailsPoolsTable'
import { TransactionsTable } from '~/pages/TokenDetails/components/activity/TransactionsTable'
import { useTDPStore } from '~/pages/TokenDetails/context/useTDPStore'
import { useMultichainTokenEntries } from '~/pages/TokenDetails/hooks/useMultichainTokenEntries'
import { useTDPEffectiveCurrency } from '~/pages/TokenDetails/hooks/useTDPEffectiveCurrency'
import { ClickableTamaguiStyle } from '~/theme/components/styles'

// The clickable chrome (cursor / hover / press / transition) applies only while `clickable`, as in
// the legacy variant; the compat prop surface resolves every ClickableTamaguiStyle member. Caller
// props spread last so the per-site `color` token still wins, like legacy.
function Tab({ clickable = true, ...rest }: TextCompatProps & { clickable?: boolean }): JSX.Element {
  return <Text color="$neutral1" variant="heading3" {...(clickable ? ClickableTamaguiStyle : {})} {...rest} />
}

// if you add a new tab, you must update the logic to disable the tab if the token is on a solana chain
enum ActivityTab {
  Txs = 0,
  Pools = 1,
}

export function ActivitySection() {
  const { t } = useTranslation()
  const referenceCurrency = useTDPEffectiveCurrency()
  const { currencyChainId, selectedMultichainChainId, multiChainMap } = useTDPStore((s) => ({
    currencyChainId: s.currencyChainId,
    selectedMultichainChainId: s.selectedMultichainChainId,
    multiChainMap: s.multiChainMap,
  }))
  const multichainEntries = useMultichainTokenEntries(multiChainMap)
  // A single-chain token has no chain selector, so `selectedMultichainChainId` is always undefined
  // for it too — only treat this as the aggregate "All networks" view when there's actually more
  // than one chain to aggregate across (matches `isMultiChainAsset` in TDPChainSearchParamSync).
  const isMultichainView = multichainEntries.length > 1 && selectedMultichainChainId === undefined

  const [activityInView, setActivityInView] = useState(ActivityTab.Txs)

  const isSolanaToken = isSVMChain(currencyChainId)
  const hasLimitedTransactionData = currencyChainId === UniverseChainId.Tempo

  useEffect(() => {
    if (isSolanaToken && activityInView === ActivityTab.Pools) {
      setActivityInView(ActivityTab.Txs)
    }
  }, [isSolanaToken, activityInView])

  return (
    <Flex data-testid="token-details-activity-section" width="100%">
      <Flex row gap="$spacing24" mb="$spacing12" id="activity-header">
        <Tab
          clickable={!isSolanaToken}
          color={activityInView === ActivityTab.Txs ? '$neutral1' : '$neutral2'}
          onPress={() => setActivityInView(ActivityTab.Txs)}
        >
          {t('common.transactions')}
        </Tab>
        {!isSolanaToken && (
          <Tab
            color={activityInView === ActivityTab.Pools ? '$neutral1' : '$neutral2'}
            onPress={() => setActivityInView(ActivityTab.Pools)}
          >
            {t('common.pools')}
          </Tab>
        )}
      </Flex>
      {hasLimitedTransactionData && (
        <Text variant="body2" color="$neutral2" mb="$spacing24">
          {t('tdp.transactions.limitedMarketData')}
        </Text>
      )}
      {activityInView === ActivityTab.Txs && (
        <TransactionsTable
          chainId={referenceCurrency.chainId}
          referenceToken={referenceCurrency.wrapped}
          isMultichainView={isMultichainView}
        />
      )}
      {activityInView === ActivityTab.Pools && !isSolanaToken && (
        <TokenDetailsPoolsTable referenceCurrency={referenceCurrency} isMultichainView={isMultichainView} />
      )}
    </Flex>
  )
}
