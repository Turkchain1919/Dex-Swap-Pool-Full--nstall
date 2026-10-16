import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Token, TransactionEventType, TransactionTokenSide } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { parseUniswapTransaction } from '~/data/transactions/poolTransaction'
import { USDC_V2_TOKEN as USDC, makeUniswapTransactionV2 as makeTx } from '~/test-utils/transactions/dataApiV2Fixtures'

describe('parseUniswapTransaction', () => {
  it('maps a swap row to the domain PoolTransaction shape', () => {
    const result = parseUniswapTransaction(makeTx(), 0)

    expect(result).toMatchObject({
      chainId: 1,
      eventType: TransactionEventType.SWAP,
      hash: '0xabc123',
      account: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      token0Quantity: '84200.500000',
      token1Quantity: '-31.78',
      usdValue: 84200.5,
    })
  })

  it('converts timestampMs (bigint ms) to seconds', () => {
    expect(parseUniswapTransaction(makeTx(), 0)?.timestamp).toBe(1716220800)
  })

  it('passes REST event types through unchanged', () => {
    expect(parseUniswapTransaction(makeTx({ eventType: TransactionEventType.ADD }), 0)?.eventType).toBe(
      TransactionEventType.ADD,
    )
    expect(parseUniswapTransaction(makeTx({ eventType: TransactionEventType.REMOVE }), 0)?.eventType).toBe(
      TransactionEventType.REMOVE,
    )
  })

  // protocolVersion no longer reaches the domain row — it survives only as a drop gate, so keep both
  // directions pinned: an unspecified version drops the row (below), a real one must not.
  it('keeps rows for every specified protocol version', () => {
    expect(parseUniswapTransaction(makeTx({ protocolVersion: ProtocolVersion.V2 }), 0)).toBeDefined()
    expect(parseUniswapTransaction(makeTx({ protocolVersion: ProtocolVersion.V4 }), 0)).toBeDefined()
  })

  it('drops rows with unspecified event type, unspecified protocol version, or unknown chain', () => {
    expect(parseUniswapTransaction(makeTx({ eventType: TransactionEventType.UNSPECIFIED }), 0)).toBeUndefined()
    expect(parseUniswapTransaction(makeTx({ protocolVersion: ProtocolVersion.UNSPECIFIED }), 0)).toBeUndefined()
    expect(parseUniswapTransaction(makeTx({ chainId: 999999 }), 0)).toBeUndefined()
  })

  it('maps token sides including project logo', () => {
    const result = parseUniswapTransaction(makeTx(), 0)

    expect(result?.token0).toEqual({
      chainId: 1,
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoUrl: 'https://logo.example/usdc.png',
    })
    expect(result?.token1.logoUrl).toBeUndefined()
    expect(result?.token1.name).toBe('Wrapped Ether')
  })

  it('treats an empty token address as undefined (native currency)', () => {
    const tx = makeTx({
      token0: new TransactionTokenSide({ token: new Token({ chainId: 1, address: '', symbol: 'ETH', decimals: 18 }) }),
    })

    expect(parseUniswapTransaction(tx, 0)?.token0.address).toBeUndefined()
  })

  it('treats an unset decimals (proto default 0) as undefined', () => {
    const tx = makeTx({
      token0: new TransactionTokenSide({ token: new Token({ chainId: 1, address: USDC.address, symbol: 'USDC' }) }),
    })

    expect(parseUniswapTransaction(tx, 0)?.token0.decimals).toBeUndefined()
  })

  it('drops a row whose token side has no token, rather than treating it as native currency', () => {
    const tx = makeTx({ token0: new TransactionTokenSide({ amount: '1' }) })

    expect(parseUniswapTransaction(tx, 0)).toBeUndefined()
  })

  it('defaults a missing amount to "0"', () => {
    const tx = makeTx({ token0: new TransactionTokenSide({ token: USDC, amountUsd: 1 }) })

    expect(parseUniswapTransaction(tx, 0)?.token0Quantity).toBe('0')
  })

  it('generates unique row ids for multiple events within one tx hash', () => {
    const first = parseUniswapTransaction(makeTx(), 0)
    const second = parseUniswapTransaction(makeTx({ eventType: TransactionEventType.ADD }), 1)
    const swapDuplicate = parseUniswapTransaction(makeTx(), 2)
    // Same index as `first` — only the eventType differs, pinning that the template includes it.
    const sameIndexDifferentEvent = parseUniswapTransaction(makeTx({ eventType: TransactionEventType.ADD }), 0)

    const ids = [first?.id, second?.id, swapDuplicate?.id, sameIndexDifferentEvent?.id]
    expect(new Set(ids).size).toBe(4)
    expect(first?.id).toBe('1:0xabc123:0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640:1:0')
  })
})
