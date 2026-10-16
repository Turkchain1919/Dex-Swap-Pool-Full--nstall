import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import {
  Token,
  TokenProject,
  TransactionEventType,
  TransactionTokenSide,
  UniswapTransaction,
} from '@uniswap/client-data-api/dist/data/v2/types_pb'

export const USDC_V2_TOKEN = new Token({
  chainId: 1,
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  project: new TokenProject({ logoUrl: 'https://logo.example/usdc.png' }),
})

export const WETH_V2_TOKEN = new Token({
  chainId: 1,
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  symbol: 'WETH',
  name: 'Wrapped Ether',
  decimals: 18,
})

export function makeUniswapTransactionV2(
  overrides: Partial<ConstructorParameters<typeof UniswapTransaction>[0]> = {},
): UniswapTransaction {
  return new UniswapTransaction({
    chainId: 1,
    txHash: '0xabc123',
    timestampMs: 1716220800000n,
    eventType: TransactionEventType.SWAP,
    protocolVersion: ProtocolVersion.V3,
    poolId: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    token0: new TransactionTokenSide({ token: USDC_V2_TOKEN, amount: '84200.500000', amountUsd: 84200.5 }),
    // Signed pool-perspective: token0 entered the pool (positive), token1 left it (negative).
    token1: new TransactionTokenSide({ token: WETH_V2_TOKEN, amount: '-31.78', amountUsd: 84200.5 }),
    amountUsd: 84200.5,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    ...overrides,
  })
}
