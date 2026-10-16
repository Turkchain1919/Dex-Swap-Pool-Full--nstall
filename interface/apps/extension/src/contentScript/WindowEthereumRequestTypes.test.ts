import {
  EthSendTransactionRequestSchema,
  EthSignTypedDataV4RequestSchema,
  WalletSendCallsRequestSchema,
} from 'src/contentScript/WindowEthereumRequestTypes'
import { ZodError } from 'zod'

const REQUEST_ID = '123e4567-e89b-12d3-a456-426614174000'
const ACCOUNT = '0x1234567890123456789012345678901234567890'
const RECIPIENT = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
const APPROVE_CALLDATA =
  '0x095ea7b30000000000000000000000001234567890123456789012345678901234567890ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

describe('EthSendTransactionRequestSchema', () => {
  it('canonicalizes every numeric field before queueing the transaction', () => {
    const result = EthSendTransactionRequestSchema.parse({
      requestId: REQUEST_ID,
      method: 'eth_sendTransaction',
      params: [
        {
          from: ACCOUNT,
          to: RECIPIENT,
          value: [13, 224, 182, 179, 167, 100, 0, 0],
          gasLimit: [0x52, 0x08],
          gasPrice: [1],
          maxPriorityFeePerGas: [2],
          maxFeePerGas: [3],
          nonce: [4],
        },
      ],
    })

    expect(result.transaction).toMatchObject({
      value: '0x0de0b6b3a7640000',
      gasLimit: '0x5208',
      gasPrice: '0x01',
      maxPriorityFeePerGas: '0x02',
      maxFeePerGas: '0x03',
      nonce: '0x04',
    })
  })

  it('normalizes explicit null numeric fields to absent values', () => {
    const result = EthSendTransactionRequestSchema.parse({
      requestId: REQUEST_ID,
      method: 'eth_sendTransaction',
      params: [
        {
          from: ACCOUNT,
          to: RECIPIENT,
          value: null,
          gasLimit: null,
          gasPrice: null,
          maxPriorityFeePerGas: null,
          maxFeePerGas: null,
          nonce: null,
        },
      ],
    })

    expect(result.transaction).toEqual({
      from: ACCOUNT,
      to: RECIPIENT,
      value: undefined,
      gasLimit: undefined,
      gasPrice: undefined,
      maxPriorityFeePerGas: undefined,
      maxFeePerGas: undefined,
      nonce: undefined,
    })
  })

  it('normalizes a hexadecimal chain ID before queueing the transaction', () => {
    const result = EthSendTransactionRequestSchema.parse({
      requestId: REQUEST_ID,
      method: 'eth_sendTransaction',
      params: [{ from: ACCOUNT, to: RECIPIENT, chainId: '0x89' }],
    })

    expect(result.transaction.chainId).toBe(137)
  })

  it('rejects an unprefixed transaction chain ID string at the dapp boundary', () => {
    expect(() =>
      EthSendTransactionRequestSchema.parse({
        requestId: REQUEST_ID,
        method: 'eth_sendTransaction',
        params: [{ from: ACCOUNT, to: RECIPIENT, chainId: '10' }],
      }),
    ).toThrow(ZodError)
  })

  it('preserves a numeric transaction chain ID used by internal callers', () => {
    const result = EthSendTransactionRequestSchema.parse({
      requestId: REQUEST_ID,
      method: 'eth_sendTransaction',
      params: [{ from: ACCOUNT, to: RECIPIENT, chainId: 10 }],
    })

    expect(result.transaction.chainId).toBe(10)
  })

  it('queues the control and byte-array bypass with the same canonical value', () => {
    const request = {
      requestId: REQUEST_ID,
      method: 'eth_sendTransaction',
      params: [{ from: ACCOUNT, to: RECIPIENT, value: '0x0' }],
    }
    const control = EthSendTransactionRequestSchema.parse(request)
    const bypass = EthSendTransactionRequestSchema.parse({
      ...request,
      params: [{ from: ACCOUNT, to: RECIPIENT, value: [0] }],
    })

    expect(bypass.transaction).toEqual(control.transaction)
    expect(bypass.transaction.value).toBe('0x00')
  })

  it('normalizes mixed-case calldata before queueing', () => {
    const result = EthSendTransactionRequestSchema.parse({
      requestId: REQUEST_ID,
      method: 'eth_sendTransaction',
      params: [{ from: ACCOUNT, to: RECIPIENT, data: `0x${APPROVE_CALLDATA.slice(2).toUpperCase()}` }],
    })

    expect(result.transaction.data).toBe(APPROVE_CALLDATA)
  })

  it('rejects byte-array calldata at the extension boundary', () => {
    expect(() =>
      EthSendTransactionRequestSchema.parse({
        requestId: REQUEST_ID,
        method: 'eth_sendTransaction',
        params: [{ from: ACCOUNT, to: RECIPIENT, data: [9, 94, 167, 179] }],
      }),
    ).toThrow(ZodError)
  })

  it('rejects numeric values that ethers cannot sign', () => {
    expect(() =>
      EthSendTransactionRequestSchema.parse({
        requestId: REQUEST_ID,
        method: 'eth_sendTransaction',
        params: [{ from: ACCOUNT, to: RECIPIENT, value: { unsupported: true } }],
      }),
    ).toThrow(ZodError)
  })

  it('rejects negative transaction quantities', () => {
    expect(() =>
      EthSendTransactionRequestSchema.parse({
        requestId: REQUEST_ID,
        method: 'eth_sendTransaction',
        params: [{ from: ACCOUNT, to: RECIPIENT, value: -1 }],
      }),
    ).toThrow(ZodError)
  })
})

describe('EthSignTypedDataV4RequestSchema', () => {
  const typedData = {
    types: {
      EIP712Domain: [{ name: 'chainId', type: 'uint256' }],
      Approval: [{ name: 'amount', type: 'uint256' }],
    },
    domain: { chainId: '0x1' },
    primaryType: 'Approval',
    message: { amount: [0] },
  }

  it('queues the same canonical typed data used by ethers for signing', () => {
    const result = EthSignTypedDataV4RequestSchema.parse({
      requestId: REQUEST_ID,
      method: 'eth_signTypedData_v4',
      params: [ACCOUNT, JSON.stringify(typedData)],
    })

    expect(JSON.parse(result.typedData)).toMatchObject({
      domain: { chainId: '1' },
      primaryType: 'Approval',
      message: { amount: '0' },
    })
    expect(result.params).toEqual([ACCOUNT, result.typedData])
  })

  it('preserves a multi-digit chain ID after typed-data canonicalization', () => {
    const result = EthSignTypedDataV4RequestSchema.parse({
      requestId: REQUEST_ID,
      method: 'eth_signTypedData_v4',
      params: [ACCOUNT, JSON.stringify({ ...typedData, domain: { chainId: '0x89' } })],
    })

    expect(JSON.parse(result.typedData).domain.chainId).toBe('137')
  })

  it('rejects typed-data integers that ethers cannot sign', () => {
    expect(() =>
      EthSignTypedDataV4RequestSchema.parse({
        requestId: REQUEST_ID,
        method: 'eth_signTypedData_v4',
        params: [ACCOUNT, JSON.stringify({ ...typedData, message: { amount: -1 } })],
      }),
    ).toThrow(ZodError)
  })
})

describe('WalletSendCallsRequestSchema', () => {
  it('retains the request envelope and normalizes a value-only call', () => {
    const result = WalletSendCallsRequestSchema.parse({
      requestId: REQUEST_ID,
      method: 'wallet_sendCalls',
      params: [
        {
          version: '2.0.0',
          id: `0x${'12'.repeat(32)}`,
          from: ACCOUNT,
          chainId: '0x1',
          calls: [{ to: RECIPIENT, value: '0x1' }],
          capabilities: {
            paymasterService: { url: 'https://paymaster.example' },
          },
        },
      ],
    })

    expect(result).toMatchObject({
      version: '2.0.0',
      id: `0x${'12'.repeat(32)}`,
      from: ACCOUNT,
      chainId: '0x1',
      calls: [{ to: RECIPIENT, data: '0x', value: '0x1' }],
      capabilities: { paymasterService: { url: 'https://paymaster.example' } },
    })
  })

  it('rejects the entire request when a call has an unsupported recipient', () => {
    try {
      WalletSendCallsRequestSchema.parse({
        requestId: REQUEST_ID,
        method: 'wallet_sendCalls',
        params: [
          {
            version: '2.0.0',
            from: ACCOUNT,
            chainId: '0x1',
            calls: [
              { to: '0x1234', data: '0xabcdef' },
              { to: RECIPIENT, data: '0xabcdef' },
            ],
          },
        ],
      })
      expect.unreachable('Expected an invalid wallet_sendCalls request to be rejected')
    } catch (error) {
      // The content-script boundary turns Zod errors into an EIP-1193 response. A plain Error is
      // only logged there and would leave the dapp's request pending indefinitely.
      expect(error).toBeInstanceOf(ZodError)
      expect(error).toHaveProperty('issues.0.message', 'wallet_sendCalls call 0 has an unsupported recipient')
    }
  })
})
