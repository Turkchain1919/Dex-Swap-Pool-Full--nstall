import { GraphQLApi } from '@universe/api'
import { useMemo } from 'react'
import { useTokenDetailsContext } from 'src/components/TokenDetails/TokenDetailsContext'
import { useCrossChainBalances } from 'uniswap/src/data/apiClients/dataApiService/balances/hooks/useCrossChainBalances'
import { toGraphQLChain } from 'uniswap/src/features/chains/utils'
import type { DataApiOutageState, PortfolioBalance } from 'uniswap/src/features/dataApi/types'

type CrossChainToken = { address: string | null; chain: GraphQLApi.Chain }

export function useTokenDetailsCrossChainBalances({ evmAddress }: { evmAddress: string | undefined }): {
  crossChainTokens: CrossChainToken[]
  currentChainBalance: PortfolioBalance | null
  otherChainBalances: PortfolioBalance[] | null
} & DataApiOutageState {
  const { currencyId, multichainTokens } = useTokenDetailsContext()

  const crossChainTokens = useMemo<CrossChainToken[]>(() => {
    return multichainTokens.map(({ chainId, address }) => {
      return { address, chain: toGraphQLChain(chainId) }
    })
  }, [multichainTokens])

  const { currentChainBalance, otherChainBalances, error, dataUpdatedAt } = useCrossChainBalances({
    evmAddress,
    currencyId,
    crossChainTokens,
  })

  return { crossChainTokens, currentChainBalance, otherChainBalances, error, dataUpdatedAt }
}
