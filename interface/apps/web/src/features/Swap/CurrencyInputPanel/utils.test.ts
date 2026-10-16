import { Token } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import { DAI } from 'uniswap/src/constants/tokens'
import { formatCurrencySymbol } from '~/features/Swap/CurrencyInputPanel/utils'

describe('formatCurrencySymbol', () => {
  it('should return undefined if currency is undefined', () => {
    expect(formatCurrencySymbol(undefined)).toBeUndefined()
  })
  it('should return DAI for DAI', () => {
    expect(formatCurrencySymbol(DAI)).toEqual('DAI')
  })
  it('should return a truncated symbol if its long', () => {
    const daiWithLongSymbol = new Token(UniverseChainId.Mainnet, DAI.address, DAI.decimals, DAI.symbol?.repeat(10))
    expect(formatCurrencySymbol(daiWithLongSymbol)).toEqual('DAID...AIDAI')
  })
})
