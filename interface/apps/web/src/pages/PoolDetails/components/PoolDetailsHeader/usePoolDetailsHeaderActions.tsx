import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { UniverseChainId } from '@universe/chains'
import { BlockExplorer } from '@universe/mycelium/icons/BlockExplorer'
import { ChartBarCrossed } from '@universe/mycelium/icons/ChartBarCrossed'
import { Ellipsis } from '@universe/mycelium/icons/Ellipsis'
import { ExternalLink } from '@universe/mycelium/icons/ExternalLink'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getBlockExplorerIcon } from 'uniswap/src/components/chains/BlockExplorerIcon'
import { type ParsedToken, isNativeParsedToken } from 'uniswap/src/features/dataApi/utils/parsedToken'
import { ExplorerDataType, getExplorerLink } from 'uniswap/src/utils/linking'
import { shortenAddress } from 'utilities/src/addresses'
import { deriveFromSections } from '~/components/StickyCollapsibleHeader/HeaderActions/deriveHeaderActions'
import type { HeaderAction, HeaderActionSection } from '~/components/StickyCollapsibleHeader/HeaderActions/types'
import { useShareAction } from '~/components/StickyCollapsibleHeader/HeaderActions/useShareAction'
import { NATIVE_CHAIN_ID } from '~/constants/tokens'

type UsePoolDetailsHeaderActionsParams = {
  chainId?: UniverseChainId
  poolAddress?: string
  poolName: string
  token0?: ParsedToken
  token1?: ParsedToken
  protocolVersion?: ProtocolVersion
  openReportDataIssueModal: () => void
  isMobileScreen: boolean
}

function getExplorerUrl(params: {
  chainId: UniverseChainId
  address: string | undefined
  type: ExplorerDataType
}): string | undefined {
  const { chainId, address, type } = params
  if (!address) {
    return undefined
  }
  return getExplorerLink({ chainId, data: address, type })
}

export function usePoolDetailsHeaderActions({
  chainId,
  poolAddress,
  poolName,
  token0,
  token1,
  protocolVersion,
  openReportDataIssueModal,
  isMobileScreen,
}: UsePoolDetailsHeaderActionsParams): {
  desktopHeaderActions: HeaderAction[]
  mobileHeaderActionSections: HeaderActionSection[]
} {
  const { t } = useTranslation()
  const { shareAction } = useShareAction({
    name: poolName,
    utmSource: 'share-pool',
    isMobileScreen,
  })

  const hasReportData = Boolean(poolAddress && chainId && token0 && token1 && protocolVersion)

  const BlockExplorerIcon = chainId ? getBlockExplorerIcon(chainId) : null

  const poolExplorerUrl =
    chainId && poolAddress && protocolVersion !== ProtocolVersion.V4
      ? getExplorerUrl({ chainId, address: poolAddress, type: ExplorerDataType.ADDRESS })
      : undefined
  // Absent address = native on the parsed shape; the NATIVE_CHAIN_ID sentinel keeps the explorer
  // row (linking to the chain's native asset page) instead of dropping the native leg entirely.
  const token0Address = token0?.address
  const token0IsNative = token0 ? isNativeParsedToken(token0) : false
  const token0ExplorerUrl =
    chainId && token0
      ? getExplorerUrl({
          chainId,
          address: token0Address ?? NATIVE_CHAIN_ID,
          type: token0IsNative ? ExplorerDataType.NATIVE : ExplorerDataType.TOKEN,
        })
      : undefined
  const token1Address = token1?.address
  const token1IsNative = token1 ? isNativeParsedToken(token1) : false
  const token1ExplorerUrl =
    chainId && token1
      ? getExplorerUrl({
          chainId,
          address: token1Address ?? NATIVE_CHAIN_ID,
          type: token1IsNative ? ExplorerDataType.NATIVE : ExplorerDataType.TOKEN,
        })
      : undefined

  const explorerDropdownItems = useMemo(() => {
    if (!chainId || !BlockExplorerIcon) {
      return []
    }
    const linkIcon = <ExternalLink size="$icon.16" color="$neutral2" strokeWidth={0} />
    const items: Array<{
      title: string
      subtitle?: string
      icon: JSX.Element
      trailingIcon?: JSX.Element
      onPress: () => void
      show: boolean
    }> = []
    if (poolExplorerUrl && poolAddress) {
      items.push({
        title: t('common.pool'),
        subtitle: shortenAddress({ address: poolAddress }),
        icon: <BlockExplorerIcon size="$icon.18" color="$neutral1" />,
        trailingIcon: linkIcon,
        onPress: () => window.open(poolExplorerUrl, '_blank'),
        show: true,
      })
    }
    if (token0ExplorerUrl && token0?.symbol) {
      items.push({
        title: token0.symbol,
        subtitle: !token0IsNative && token0Address ? shortenAddress({ address: token0Address }) : undefined,
        icon: <BlockExplorerIcon size="$icon.18" color="$neutral1" />,
        trailingIcon: linkIcon,
        onPress: () => window.open(token0ExplorerUrl, '_blank'),
        show: true,
      })
    }
    if (token1ExplorerUrl && token1?.symbol) {
      items.push({
        title: token1.symbol,
        subtitle: !token1IsNative && token1Address ? shortenAddress({ address: token1Address }) : undefined,
        icon: <BlockExplorerIcon size="$icon.18" color="$neutral1" />,
        trailingIcon: linkIcon,
        onPress: () => window.open(token1ExplorerUrl, '_blank'),
        show: true,
      })
    }
    return items
  }, [
    chainId,
    BlockExplorerIcon,
    poolExplorerUrl,
    poolAddress,
    token0ExplorerUrl,
    token1ExplorerUrl,
    token0?.symbol,
    token1?.symbol,
    token0Address,
    token1Address,
    token0IsNative,
    token1IsNative,
    t,
  ])

  const sections: HeaderActionSection[] = useMemo(() => {
    const result: HeaderActionSection[] = []

    if (explorerDropdownItems.length > 0 && BlockExplorerIcon) {
      result.push({
        title: t('pool.explorers'),
        actions: [
          {
            title: t('pool.explorers'),
            icon: <BlockExplorer size="$icon.18" color="$neutral2" />,
            show: true,
            dropdownItems: explorerDropdownItems,
          },
        ],
      })
    }

    result.push({
      title: t('common.share'),
      actions: [shareAction],
    })

    if (hasReportData) {
      result.push({
        title: t('common.report'),
        actions: [
          {
            title: t('common.more'),
            icon: <Ellipsis size="$icon.18" color="$neutral2" />,
            show: true,
            dropdownItems: [
              {
                title: t('reporting.token.data.title'),
                icon: <ChartBarCrossed size="$icon.18" color="$neutral1" />,
                onPress: openReportDataIssueModal,
                show: true,
              },
            ],
          },
        ],
      })
    }

    return result
  }, [explorerDropdownItems, BlockExplorerIcon, shareAction, t, hasReportData, openReportDataIssueModal])

  return useMemo(() => deriveFromSections(sections), [sections])
}
