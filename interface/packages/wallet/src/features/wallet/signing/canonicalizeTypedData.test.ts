import { _TypedDataEncoder } from '@ethersproject/hash'
import { canonicalizeTypedData } from 'wallet/src/features/wallet/signing/canonicalizeTypedData'

const DOMAIN = {
  name: 'Permit2',
  chainId: 1,
  verifyingContract: '0x000000000022d473030f116ddee9f6b43ac78ba3',
}

const TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  PermitDetails: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' },
  ],
  PermitSingle: [
    { name: 'details', type: 'PermitDetails' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' },
  ],
}

const TOKEN = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const SPENDER = '0x00001f78189be22c3498cff1b8e02272c3220000'
const ACCOUNT = '0x1234567890123456789012345678901234567890'
const MAX_UINT160 = '1461501637330902918203684832716283019655932542975'
const MAX_UINT48 = '281474976710655'

function buildPermit2TypedData(message: Record<string, unknown>): string {
  return JSON.stringify({
    types: TYPES,
    domain: DOMAIN,
    primaryType: 'PermitSingle',
    message,
  })
}

function withoutDomainType(
  types: Record<string, Array<{ name: string; type: string }>>,
): Record<string, Array<{ name: string; type: string }>> {
  return Object.fromEntries(Object.entries(types).filter(([typeName]) => typeName !== 'EIP712Domain'))
}

describe(canonicalizeTypedData, () => {
  it('converges Permit2 byte arrays and decimal strings to the same signed payload', () => {
    const controlMessage = {
      details: { token: TOKEN, amount: MAX_UINT160, expiration: MAX_UINT48, nonce: '0' },
      spender: SPENDER,
      sigDeadline: MAX_UINT48,
    }
    const bypassMessage = {
      details: {
        token: TOKEN,
        amount: Array(20).fill(0xff),
        expiration: Array(6).fill(0xff),
        nonce: [0],
      },
      spender: SPENDER,
      sigDeadline: Array(6).fill(0xff),
    }

    const control = canonicalizeTypedData(buildPermit2TypedData(controlMessage))
    const bypass = canonicalizeTypedData(buildPermit2TypedData(bypassMessage))

    expect(bypass).toBe(control)
    expect(JSON.parse(bypass).message).toEqual(controlMessage)
    expect(_TypedDataEncoder.hash(DOMAIN, withoutDomainType(TYPES), bypassMessage)).toBe(
      _TypedDataEncoder.hash(DOMAIN, withoutDomainType(TYPES), controlMessage),
    )
  })

  it('preserves the signed hash for nested arrays of structs', () => {
    const domain = {
      name: 'Seaport',
      version: '1.6',
      chainId: 1,
      verifyingContract: '0x0000000000000068f116a894984e2db1123eb395',
    }
    const types = {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      OfferItem: [
        { name: 'itemType', type: 'uint8' },
        { name: 'token', type: 'address' },
        { name: 'identifierOrCriteria', type: 'uint256' },
        { name: 'startAmount', type: 'uint256' },
        { name: 'endAmount', type: 'uint256' },
      ],
      ConsiderationItem: [
        { name: 'itemType', type: 'uint8' },
        { name: 'token', type: 'address' },
        { name: 'identifierOrCriteria', type: 'uint256' },
        { name: 'startAmount', type: 'uint256' },
        { name: 'endAmount', type: 'uint256' },
        { name: 'recipient', type: 'address' },
      ],
      OrderComponents: [
        { name: 'offerer', type: 'address' },
        { name: 'zone', type: 'address' },
        { name: 'offer', type: 'OfferItem[]' },
        { name: 'consideration', type: 'ConsiderationItem[]' },
        { name: 'orderType', type: 'uint8' },
        { name: 'startTime', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
        { name: 'zoneHash', type: 'bytes32' },
        { name: 'salt', type: 'uint256' },
        { name: 'conduitKey', type: 'bytes32' },
        { name: 'counter', type: 'uint256' },
      ],
    }
    const message = {
      offerer: ACCOUNT,
      zone: '0x0000000000000000000000000000000000000000',
      offer: [
        {
          itemType: [2],
          token: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
          identifierOrCriteria: [0x2a],
          startAmount: [1],
          endAmount: '1',
        },
      ],
      consideration: [
        {
          itemType: 0,
          token: '0x0000000000000000000000000000000000000000',
          identifierOrCriteria: 0,
          startAmount: '0x2386f26fc10000',
          endAmount: '10000000000000000',
          recipient: ACCOUNT,
        },
      ],
      orderType: 0,
      startTime: '0x1',
      endTime: '4102444800',
      zoneHash: `0x${'00'.repeat(32)}`,
      salt: [1, 2, 3, 4],
      conduitKey: `0x${'00'.repeat(32)}`,
      counter: 0,
    }

    const canonical = JSON.parse(
      canonicalizeTypedData(JSON.stringify({ domain, types, primaryType: 'OrderComponents', message })),
    ) as {
      domain: typeof domain
      types: Record<string, Array<{ name: string; type: string }>>
      message: Record<string, unknown>
    }

    expect(_TypedDataEncoder.hash(canonical.domain, withoutDomainType(canonical.types), canonical.message)).toBe(
      _TypedDataEncoder.hash(domain, withoutDomainType(types), message),
    )
  })

  it('preserves typed arrays while canonicalizing each integer element', () => {
    const canonical = canonicalizeTypedData(
      JSON.stringify({
        types: {
          EIP712Domain: [{ name: 'chainId', type: 'uint256' }],
          Batch: [{ name: 'values', type: 'uint256[]' }],
        },
        domain: { chainId: 1 },
        primaryType: 'Batch',
        message: { values: [1, '2', [3]] },
      }),
    )

    expect(JSON.parse(canonical).message.values).toEqual(['1', '2', '3'])
  })

  it('uses the supplied primary type and drops disconnected type definitions', () => {
    const canonical = canonicalizeTypedData(
      JSON.stringify({
        types: {
          EIP712Domain: [{ name: 'chainId', type: 'uint256' }],
          Item: [{ name: 'value', type: 'uint256' }],
          Batch: [{ name: 'items', type: 'Item[]' }],
          UnusedWrapper: [{ name: 'batch', type: 'Batch' }],
          Disconnected: [{ name: 'value', type: 'string' }],
        },
        domain: { chainId: 1 },
        primaryType: 'Batch',
        message: { items: [{ value: [1] }, { value: '2' }] },
      }),
    )

    expect(JSON.parse(canonical)).toMatchObject({
      primaryType: 'Batch',
      message: { items: [{ value: '1' }, { value: '2' }] },
      types: {
        Item: [{ name: 'value', type: 'uint256' }],
        Batch: [{ name: 'items', type: 'Item[]' }],
      },
    })
    expect(JSON.parse(canonical).types).not.toHaveProperty('UnusedWrapper')
    expect(JSON.parse(canonical).types).not.toHaveProperty('Disconnected')
  })

  it.each([
    { name: 'missing', primaryType: undefined },
    { name: 'unknown', primaryType: 'Unknown' },
  ])('rejects a $name primary type', ({ primaryType }) => {
    expect(() =>
      canonicalizeTypedData(
        JSON.stringify({
          types: { Message: [{ name: 'value', type: 'uint256' }] },
          domain: {},
          ...(primaryType ? { primaryType } : {}),
          message: { value: 1 },
        }),
      ),
    ).toThrow()
  })

  it('rejects unsigned integers that ethers cannot sign', () => {
    expect(() =>
      canonicalizeTypedData(
        buildPermit2TypedData({
          details: { token: TOKEN, amount: -1, expiration: MAX_UINT48, nonce: '0' },
          spender: SPENDER,
          sigDeadline: MAX_UINT48,
        }),
      ),
    ).toThrow()
  })
})
