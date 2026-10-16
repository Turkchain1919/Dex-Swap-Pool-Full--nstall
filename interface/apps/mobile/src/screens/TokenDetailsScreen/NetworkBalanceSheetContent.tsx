import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { Flex, Text } from '@universe/mycelium'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { NetworkBalanceList } from 'src/components/TokenDetails/NetworkBalanceList'
import { PortfolioBalance } from 'uniswap/src/features/dataApi/types'
import { useBottomScreenGap } from 'uniswap/src/hooks/useBottomScreenGap'

const STICKY_HEADER_INDICES = [0]

interface NetworkBalanceSheetContentProps {
  allChainBalances: PortfolioBalance[]
  onSelectBalance: (balance: PortfolioBalance) => void
}

export function NetworkBalanceSheetContent({
  allChainBalances,
  onSelectBalance,
}: NetworkBalanceSheetContentProps): JSX.Element {
  const { t } = useTranslation()
  const { bottomScreenTotalGap } = useBottomScreenGap()
  const contentContainerStyle = useMemo(() => ({ paddingBottom: bottomScreenTotalGap }), [bottomScreenTotalGap])

  return (
    <BottomSheetScrollView
      stickyHeaderIndices={STICKY_HEADER_INDICES}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
    >
      <Flex backgroundColor="$surface1" px="$spacing24" py="$spacing12">
        <Text variant="body1" color="$neutral1">
          {t('token.balances.chooseNetwork')}
        </Text>
      </Flex>
      <Flex px="$spacing24">
        <NetworkBalanceList balances={allChainBalances} onSelectBalance={onSelectBalance} />
      </Flex>
    </BottomSheetScrollView>
  )
}
