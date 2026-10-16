import { Currency } from '@uniswap/sdk-core'
import { isWebPlatform } from '@universe/environment'
import { Flex, Text, type TextCompatProps } from '@universe/mycelium'
import { styled } from '@universe/mycelium/styled'
import { TooltipCompat as Tooltip } from '@universe/mycelium/tooltip-compat'
import { ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CurrencyLogo } from 'uniswap/src/components/CurrencyLogo/CurrencyLogo'
import { SplitLogo } from 'uniswap/src/components/CurrencyLogo/SplitLogo'
import { BIPS_BASE } from 'uniswap/src/constants/misc'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { currencyId, currencyIdToChain } from 'uniswap/src/utils/currencyId'
import type { RoutingDiagramEntry, RoutingHop } from 'uniswap/src/utils/routingDiagram/types'

const HOP_BASE_CHARACTER_COST = 10
const FIRST_ROUTE_ROW_CHARACTER_BUDGET = 36
const ADDITIONAL_ROUTE_ROW_CHARACTER_BUDGET = 48

// Frames transcribed from the parity fixture
// (packages/tailwind/src/parity/styled-factory/routing-badges/frame.ts):
// Flex base (flex-col) + the legacy `row`/`centered` parent-variant presets,
// inlined as literal classes.
const PoolBadge = styled(Flex, {
  base: 'flex-row items-center justify-center p-2',
})

const OpaqueBadgeFrame = styled(PoolBadge, {
  base: 'bg-surface2 rounded-8 justify-start p-1 z-sticky',
})

// The legacy `$platform-web` block (display:grid + gridGap $spacing4 +
// gridAutoFlow column) reduces, on this row-flex badge, to the 4px
// inter-child gap. `$platform-web` fires on every DOM platform (web app
// and extension), so gate on isWebPlatform; the legacy native render
// emits none of it.
function OpaqueBadge({ children }: { children: ReactNode }): JSX.Element {
  return <OpaqueBadgeFrame className={isWebPlatform ? 'gap-1' : undefined}>{children}</OpaqueBadgeFrame>
}

// The legacy `$platform-web` `wordBreak: 'normal'` was a no-op (word-break's
// initial value, and nothing else sets it), so only the body4 preset carries.
function BadgeText({ children, style }: { children?: ReactNode; style?: TextCompatProps['style'] }): JSX.Element {
  return (
    <Text variant="body4" style={style}>
      {children}
    </Text>
  )
}

function useHopBadgeContent({ hop, tokenPair }: { hop: RoutingHop; tokenPair: string }): {
  badgeText: string
  tooltipText: string
} {
  const { t } = useTranslation()

  // Disabling this rule so that it elint warns us when we add a new hop type and it's properly handled.
  // oxlint-disable-next-line typescript/consistent-return
  return useMemo(() => {
    switch (hop.type) {
      case 'uniswapPool': {
        const feePercent = hop.fee / BIPS_BASE
        const poolFeeText = hop.isDynamic ? t('pool.dynamic') : t('pool.percent', { pct: feePercent })

        return {
          badgeText: hop.isDynamic ? t('common.dynamic') : `${feePercent}%`,
          tooltipText: `${tokenPair} ${poolFeeText}`,
        }
      }

      case 'genericHop': {
        return {
          badgeText: hop.name,
          tooltipText: t('pool.via', { tokenPair, dex: hop.name }),
        }
      }
    }
  }, [hop, tokenPair, t])
}

function HopBadge({ hop }: { hop: RoutingHop }): JSX.Element {
  const inputCurrencyInfo = useCurrencyInfo(hop.inputCurrencyId)
  const outputCurrencyInfo = useCurrencyInfo(hop.outputCurrencyId)

  const inputSymbol = inputCurrencyInfo?.currency.symbol ?? '-'
  const outputSymbol = outputCurrencyInfo?.currency.symbol ?? '-'
  const tokenPair = `${inputSymbol}/${outputSymbol}`

  const chainId = inputCurrencyInfo?.currency.chainId ?? currencyIdToChain(hop.inputCurrencyId)

  const { badgeText, tooltipText } = useHopBadgeContent({ hop, tokenPair })

  return (
    <Tooltip placement="top">
      <Tooltip.Trigger cursor="default">
        <OpaqueBadge>
          <Flex ml={2}>
            <SplitLogo
              chainId={chainId}
              inputCurrencyInfo={inputCurrencyInfo}
              outputCurrencyInfo={outputCurrencyInfo}
              size={16}
            />
          </Flex>
          <BadgeText>{badgeText}</BadgeText>
        </OpaqueBadge>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Text variant="body4">{tooltipText}</Text>
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip>
  )
}

export function RoutingDiagram({
  currencyIn,
  currencyOut,
  routes,
}: {
  currencyIn: Currency
  currencyOut: Currency
  routes: RoutingDiagramEntry[]
}): JSX.Element {
  const currencyInCurrencyInfo = useCurrencyInfo(currencyId(currencyIn))
  const currencyOutCurrencyInfo = useCurrencyInfo(currencyId(currencyOut))

  return (
    <Flex>
      {routes.map((entry, index) => (
        <RouteRow
          key={index}
          entry={entry}
          currencyInCurrencyInfo={currencyInCurrencyInfo}
          currencyOutCurrencyInfo={currencyOutCurrencyInfo}
        />
      ))}
    </Flex>
  )
}

function RouteRow({
  entry,
  currencyInCurrencyInfo,
  currencyOutCurrencyInfo,
}: {
  entry: RoutingDiagramEntry
  currencyInCurrencyInfo: Maybe<CurrencyInfo>
  currencyOutCurrencyInfo: Maybe<CurrencyInfo>
}): JSX.Element {
  const { path } = entry
  const pathRows = useMemo(() => splitPathIntoRows(path), [path])

  if (pathRows.length === 1) {
    return (
      <Flex row alignItems="center" gap="$spacing4">
        <CurrencyLogo currencyInfo={currencyInCurrencyInfo} size={16} />
        <Route entry={entry} />
        <CurrencyLogo currencyInfo={currencyOutCurrencyInfo} size={16} />
      </Flex>
    )
  }

  return (
    <Flex width="100%" gap="$spacing4">
      {pathRows.map((rowPath, rowIndex) => {
        const isFirstRow = rowIndex === 0
        const isLastRow = rowIndex === pathRows.length - 1

        return (
          <Flex key={rowIndex} row alignItems="center" width="100%" gap="$spacing4">
            <Flex ml="$spacing4" width={16}>
              {isFirstRow && <CurrencyLogo currencyInfo={currencyInCurrencyInfo} size={16} />}
            </Flex>

            <Flex flex={1}>
              <Route entry={{ ...entry, path: rowPath }} showBadge={isFirstRow} />
            </Flex>

            <Flex mr="$spacing4" width={16}>
              {isLastRow && <CurrencyLogo currencyInfo={currencyOutCurrencyInfo} size={16} />}
            </Flex>
          </Flex>
        )
      })}
    </Flex>
  )
}

function getHopCharacterCost(hop: RoutingHop): number {
  if (hop.type === 'genericHop') {
    return hop.name.length + HOP_BASE_CHARACTER_COST
  }

  const feeText = hop.isDynamic ? 'dynamic' : `${hop.fee / BIPS_BASE}%`
  return feeText.length + HOP_BASE_CHARACTER_COST
}

function splitPathIntoRows(path: RoutingHop[]): RoutingHop[][] {
  const rows: RoutingHop[][] = []
  let currentRowCharacterCost = 0

  for (const hop of path) {
    const hopCharacterCost = getHopCharacterCost(hop)
    const currentRow = rows.at(-1)

    if (!currentRow) {
      rows.push([hop])
      currentRowCharacterCost = hopCharacterCost
      continue
    }

    // The first row includes the route badge (protocol + percent), so it has less space for hop badges.
    const currentRowCharacterBudget =
      rows.length === 1 ? FIRST_ROUTE_ROW_CHARACTER_BUDGET : ADDITIONAL_ROUTE_ROW_CHARACTER_BUDGET

    if (currentRowCharacterCost + hopCharacterCost > currentRowCharacterBudget) {
      rows.push([hop])
      currentRowCharacterCost = hopCharacterCost
      continue
    }

    currentRow.push(hop)
    currentRowCharacterCost += hopCharacterCost
  }

  return rows
}

function Route({ entry, showBadge = true }: { entry: RoutingDiagramEntry; showBadge?: boolean }): JSX.Element {
  return (
    <Flex row justifyContent="space-evenly" flex={1} position="relative" width="auto">
      <Flex
        alignItems="center"
        justifyContent="center"
        position="absolute"
        width="100%"
        height="100%"
        left={0}
        top={0}
        zIndex={1}
        opacity={0.5}
      >
        <DottedLine />
      </Flex>

      {showBadge && (
        <OpaqueBadge>
          <ProtocolBadge protocolLabel={entry.protocolLabel} />
          <BadgeText style={{ minWidth: 'auto' }}>{entry.percent.toSignificant(2)}%</BadgeText>
        </OpaqueBadge>
      )}

      <Flex row gap="$spacing4" width="auto" zIndex={2} flex={1} justifyContent="space-evenly" alignItems="center">
        {entry.path.map((hop, index) => (
          <HopBadge key={index} hop={hop} />
        ))}
      </Flex>
    </Flex>
  )
}

// Flex circles instead of an SVG strokeDasharray — the SVG path doesn't
// size reliably under react-native-svg.
const DOTS = Array.from({ length: 40 })

function DottedLine(): JSX.Element {
  return (
    <Flex row width="100%" alignItems="center" justifyContent="space-between">
      {DOTS.map((_, i) => (
        <Flex key={i} width={2} height={2} borderRadius="$roundedFull" backgroundColor="$neutral2" />
      ))}
    </Flex>
  )
}

function ProtocolBadge({ protocolLabel }: { protocolLabel: string }): JSX.Element {
  return (
    <Flex backgroundColor="$surface3" px="$spacing4" borderRadius="$rounded6">
      <Text fontSize={8} color="$neutral2" lineHeight={12}>
        {protocolLabel}
      </Text>
    </Flex>
  )
}
