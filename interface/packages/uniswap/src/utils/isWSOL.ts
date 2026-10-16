import { Currency } from '@uniswap/sdk-core'
import { UniverseChainId, areAddressesEqual } from '@universe/chains'
import { WRAPPED_SOL_ADDRESS_SOLANA } from 'uniswap/src/features/chains/svm/defaults'

/**
 * Checks if a currency is WSOL (Wrapped SOL)
 */
export function isWSOL(currency: Currency): boolean {
  return (
    !currency.isNative &&
    areAddressesEqual({
      addressInput1: { address: currency.address, chainId: currency.chainId },
      addressInput2: { address: WRAPPED_SOL_ADDRESS_SOLANA, chainId: UniverseChainId.Solana },
    })
  )
}
