import { UniverseChainId } from '@universe/chains'
import { Flex, Text, TouchableArea } from '@universe/mycelium'
import { ChevronsIn } from '@universe/mycelium/icons/ChevronsIn'
import { ChevronsOut } from '@universe/mycelium/icons/ChevronsOut'
import { memo, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { EM_DASH } from 'ui/src'
import { TokenLogo } from 'uniswap/src/components/CurrencyLogo/TokenLogo'
import { GroupHoverTransition } from 'uniswap/src/components/GroupHoverTransition'
import { NetworkIconList } from 'uniswap/src/components/network/NetworkIconList/NetworkIconList'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { getSymbolDisplayText } from 'uniswap/src/utils/currency'
import { TableRowHoverContext } from '~/components/Table/TableRowHoverContext'
import { EmptyTableCell } from '~/pages/Portfolio/EmptyTableCell'

const SYMBOL_SLOT_HEIGHT = 18

interface TokenDisplayProps {
  currencyInfo: CurrencyInfo | null
  chainIds?: UniverseChainId[]
  isExpanded?: boolean
  displayName?: string
  displaySymbol?: string
  onNameClick?: () => void
  /** Explore-style unified expandable row: always show symbol + chevron instead of hover-to-expand affordance. */
  unifiedExpandableRows?: boolean
}

export const TokenDisplay = memo(function TokenDisplay({
  currencyInfo,
  chainIds,
  isExpanded,
  displayName: multichainDisplayName,
  displaySymbol: multichainDisplaySymbol,
  onNameClick,
  unifiedExpandableRows = false,
}: TokenDisplayProps) {
  const { t } = useTranslation()
  const rowHovered = useContext(TableRowHoverContext)
  if (!currencyInfo) {
    return <EmptyTableCell />
  }

  const { currency } = currencyInfo
  const displayName = multichainDisplayName ?? currency.name
  const displaySymbol = multichainDisplaySymbol ?? currency.symbol
  const symbolText = getSymbolDisplayText(displaySymbol) || EM_DASH
  const showNetworksHover = chainIds && chainIds.length > 1
  const showUnifiedExpandableSubline = unifiedExpandableRows && chainIds && chainIds.length > 1

  const unifiedExpandableSubline = (
    <Flex row alignItems="center" gap="$gap4" height={SYMBOL_SLOT_HEIGHT}>
      <Text
        variant="body4"
        $platform-web={{ minWidth: 'fit-content' }}
        color="$neutral2"
        height={SYMBOL_SLOT_HEIGHT}
        numberOfLines={1}
      >
        {symbolText}
      </Text>
      {isExpanded ? (
        <ChevronsIn color="$neutral2" size="$icon.16" />
      ) : (
        <ChevronsOut color="$neutral2" size="$icon.16" />
      )}
    </Flex>
  )

  return (
    <Flex row gap="$gap8" alignItems="center" justifyContent="flex-start" width="100%">
      <TokenLogo
        chainId={currency.chainId}
        name={displayName}
        symbol={getSymbolDisplayText(displaySymbol) || undefined}
        size={32}
        url={currencyInfo.logoUrl}
        alwaysShowNetworkLogo={chainIds?.length === 1}
        networkCount={chainIds?.length}
      />
      <Flex width="100%">
        {onNameClick ? (
          <TouchableArea
            hoverStyle={{ opacity: 0.7 }}
            onPressIn={(e) => e.stopPropagation()}
            onPressOut={(e) => e.stopPropagation()}
            onPress={(e) => {
              e.stopPropagation()
              onNameClick()
            }}
          >
            <Text variant="body3" color="$neutral1" numberOfLines={1}>
              {displayName || EM_DASH}
            </Text>
          </TouchableArea>
        ) : (
          <Text variant="body3" color="$neutral1" numberOfLines={1}>
            {displayName || EM_DASH}
          </Text>
        )}
        <GroupHoverTransition
          height={SYMBOL_SLOT_HEIGHT}
          showTransition={showNetworksHover}
          isHovered={rowHovered}
          defaultContent={
            showUnifiedExpandableSubline ? (
              unifiedExpandableSubline
            ) : (
              <Text
                variant="body4"
                $platform-web={{ minWidth: 'fit-content' }}
                color="$neutral2"
                height={SYMBOL_SLOT_HEIGHT}
                width="100%"
                numberOfLines={1}
              >
                {symbolText}
              </Text>
            )
          }
          hoverContent={
            <Flex row alignItems="center" gap="$gap4" height={SYMBOL_SLOT_HEIGHT}>
              <Text variant="body4" color="$neutral2">
                {t('portfolio.tokens.table.balances')}
              </Text>
              {!isExpanded && <NetworkIconList chainIds={chainIds ?? []} />}
              {isExpanded ? (
                <ChevronsIn color="$neutral2" size="$icon.16" />
              ) : (
                <ChevronsOut color="$neutral2" size="$icon.16" />
              )}
            </Flex>
          }
        />
      </Flex>
    </Flex>
  )
})
TokenDisplay.displayName = 'TokenDisplay'
