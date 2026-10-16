import type { GraphQLApi } from '@universe/api'
import type { UniverseChainId } from '@universe/chains'
import { fromGraphQLChain, toGraphQLChain } from 'uniswap/src/features/chains/utils'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { currencyId as toCurrencyId } from 'uniswap/src/utils/currencyId'
import type { TokenHoverCardToken } from '~/components/HoverCard/TokenHoverCard/types'
import { gqlToCurrency, unwrapToken } from '~/data/util'

export type TokenIdentity = {
  chainId: UniverseChainId
  gqlChain: GraphQLApi.Chain
  currencyIdFromToken?: string
  rawAddress?: string
}

/** Resolves the identity fields the card needs from whichever of `token`/`currencyInfo` was provided. */
export function deriveTokenIdentity({
  token,
  currencyInfoProp,
  defaultChainId,
}: {
  token?: TokenHoverCardToken
  currencyInfoProp?: CurrencyInfo
  defaultChainId: UniverseChainId
}): TokenIdentity {
  if (!token) {
    const chainId = currencyInfoProp?.currency.chainId ?? defaultChainId
    return {
      chainId,
      gqlChain: toGraphQLChain(chainId),
      currencyIdFromToken: undefined,
      rawAddress: currencyInfoProp?.currency.isToken ? currencyInfoProp.currency.address : undefined,
    }
  }

  const chainId = fromGraphQLChain(token.chain) ?? defaultChainId
  const unwrappedToken = unwrapToken(chainId, token)
  const currency = gqlToCurrency(unwrappedToken)
  return {
    chainId,
    gqlChain: token.chain,
    currencyIdFromToken: currency ? toCurrencyId(currency) : undefined,
    rawAddress: unwrappedToken.address ?? undefined,
  }
}
