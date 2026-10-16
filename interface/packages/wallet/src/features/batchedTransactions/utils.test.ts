import { TradingApi } from '@universe/api'
import { EthTransaction } from 'uniswap/src/types/walletConnect'
import { generateBatchId, transformCallsToTransactionRequests } from 'wallet/src/features/batchedTransactions/utils'

describe(generateBatchId, () => {
  it('generates a batch ID with correct format', () => {
    const batchId = generateBatchId()

    // Should start with 0x
    expect(batchId.startsWith('0x')).toBe(true)

    // Should be 66 characters long (0x + 64 hex chars)
    expect(batchId.length).toBe(66)

    // Should only contain valid hex characters after 0x
    const hexPart = batchId.slice(2)
    expect(/^[0-9a-f]+$/.test(hexPart)).toBe(true)
  })

  it('generates different IDs on each call', () => {
    const id1 = generateBatchId()
    const id2 = generateBatchId()
    expect(id1).not.toBe(id2)
  })
})

describe(transformCallsToTransactionRequests, () => {
  const mockChainId = 1
  const mockAccountAddress: Address = '0x1234567890123456789012345678901234567890'

  const validCall1: EthTransaction = {
    to: '0x1111111111111111111111111111111111111111',
    data: '0xabcd',
    value: '0x1',
    from: '0x789', // This should be overwritten
  }

  const validCall2: EthTransaction = {
    to: '0x2222222222222222222222222222222222222222',
    data: '0x1234',
    value: '0x2',
    // `from` is optional in EthTransaction, should still work
  }

  const invalidCallMissingTo: EthTransaction = {
    data: '0x456',
    value: '0x3',
  }

  const validCallMissingData: EthTransaction = {
    to: '0x3333333333333333333333333333333333333333',
    value: '0x4',
  }

  it('should transform valid calls correctly', () => {
    const calls = [validCall1, validCall2]
    const expected: TradingApi.TransactionRequest[] = [
      {
        to: validCall1.to!,
        data: validCall1.data!,
        value: validCall1.value!,
        from: mockAccountAddress,
        chainId: mockChainId,
      },
      {
        to: validCall2.to!,
        data: validCall2.data!,
        value: validCall2.value!,
        from: mockAccountAddress,
        chainId: mockChainId,
      },
    ]

    const result = transformCallsToTransactionRequests({
      calls,
      chainId: mockChainId,
      accountAddress: mockAccountAddress,
    })
    expect(result).toEqual(expected)
  })

  it('rejects the whole batch when any call has no executable recipient', () => {
    expect(() =>
      transformCallsToTransactionRequests({
        calls: [validCall1, invalidCallMissingTo, validCall2],
        chainId: mockChainId,
        accountAddress: mockAccountAddress,
      }),
    ).toThrow('call 1 has an unsupported recipient')
  })

  it('preserves a value-only call by normalizing empty calldata', () => {
    const result = transformCallsToTransactionRequests({
      calls: [validCallMissingData],
      chainId: mockChainId,
      accountAddress: mockAccountAddress,
    })

    expect(result).toEqual([
      {
        to: validCallMissingData.to,
        data: '0x',
        value: validCallMissingData.value,
        from: mockAccountAddress,
        chainId: mockChainId,
      },
    ])
  })

  it('rejects an empty batch', () => {
    const calls: EthTransaction[] = []
    expect(() =>
      transformCallsToTransactionRequests({
        calls,
        chainId: mockChainId,
        accountAddress: mockAccountAddress,
      }),
    ).toThrow('must contain at least one call')
  })

  it('strips preview-only metadata before execution', () => {
    const decoratedCall = {
      ...validCall1,
      functionSignature: 'transfer(address,uint256)',
      contractInteractions: 'Transfer',
      parsedCalldata: { attackerControlled: true },
    }

    const result = transformCallsToTransactionRequests({
      calls: [decoratedCall],
      chainId: mockChainId,
      accountAddress: mockAccountAddress,
    })

    expect(result).toEqual([
      {
        to: validCall1.to,
        data: validCall1.data,
        value: validCall1.value,
        from: mockAccountAddress,
        chainId: mockChainId,
      },
    ])
  })
})
