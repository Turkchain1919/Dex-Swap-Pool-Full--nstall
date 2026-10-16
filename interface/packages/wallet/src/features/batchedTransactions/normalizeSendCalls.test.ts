import {
  InvalidSendCallsRequestError,
  normalizeSendCalls,
  safeNormalizeSendCalls,
} from 'wallet/src/features/batchedTransactions/normalizeSendCalls'
import type { Call } from 'wallet/src/features/dappRequests/types'

const RECIPIENT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

describe('safeNormalizeSendCalls', () => {
  it('keeps the canonical shape of a valid batch, defaulting absent calldata', () => {
    const result = safeNormalizeSendCalls([
      { to: RECIPIENT, data: '0xabcdef' },
      { to: RECIPIENT, value: '0x1' },
    ])

    expect(result).toEqual({
      ok: true,
      calls: [
        { to: RECIPIENT, data: '0xabcdef' },
        { to: RECIPIENT, data: '0x', value: '0x1' },
      ],
    })
  })

  it('accepts a recipient that is valid but not checksummed', () => {
    // Refusing these would turn working dapp requests into hard failures; the batch only has to be
    // shaped the way the scan and the encoder need.
    const result = safeNormalizeSendCalls([{ to: RECIPIENT.toLowerCase(), data: '0x' }])

    expect(result.ok).toBe(true)
  })

  it("normalizes a bare '0x' value to a valid quantity", () => {
    // isHex accepts '0x', but neither the scan nor the Trading API accepts it as a quantity.
    const result = safeNormalizeSendCalls([{ to: RECIPIENT, data: '0x', value: '0x' }])

    expect(result).toEqual({ ok: true, calls: [{ to: RECIPIENT, data: '0x', value: '0x0' }] })
  })

  it("coerces empty-string calldata to '0x' rather than rejecting a plain ETH transfer", () => {
    const result = safeNormalizeSendCalls([{ to: RECIPIENT, data: '', value: '0x1' }])

    expect(result).toEqual({ ok: true, calls: [{ to: RECIPIENT, data: '0x', value: '0x1' }] })
  })

  it('coerces a decimal value string to a hex quantity', () => {
    // Some dapps/libraries emit a decimal value; canonicalize instead of rejecting (this is also
    // what the scan and the Trading API need).
    const result = safeNormalizeSendCalls([{ to: RECIPIENT, data: '0x', value: '1000000000000000000' }])

    expect(result).toEqual({ ok: true, calls: [{ to: RECIPIENT, data: '0x', value: '0xde0b6b3a7640000' }] })
  })

  it('ignores an optional per-call capability rather than rejecting the batch', () => {
    // EIP-5792: a wallet must ignore capabilities marked optional it does not support.
    const result = safeNormalizeSendCalls([
      { to: RECIPIENT, data: '0x', capabilities: { someFeature: { optional: true } } },
    ])

    expect(result).toEqual({ ok: true, calls: [{ to: RECIPIENT, data: '0x' }] })
  })

  it('strips preview-only metadata', () => {
    const result = safeNormalizeSendCalls([
      { to: RECIPIENT, data: '0xabcdef', functionSignature: 'transfer(address,uint256)' } as Call,
    ])

    expect(result).toEqual({ ok: true, calls: [{ to: RECIPIENT, data: '0xabcdef' }] })
  })

  it.each([
    ['an empty batch', [], 'must contain at least one call'],
    ['a missing recipient', [{ data: '0xabcdef' }], 'call 0 has an unsupported recipient'],
    ['a malformed recipient', [{ to: '0x1234', data: '0xabcdef' }], 'call 0 has an unsupported recipient'],
    ['a non-hex recipient', [{ to: `0x${'z'.repeat(40)}`, data: '0xabcdef' }], 'call 0 has an unsupported recipient'],
    ['non-hex calldata', [{ to: RECIPIENT, data: 'abcdef' }], 'call 0 has invalid calldata'],
    ['odd-length calldata', [{ to: RECIPIENT, data: '0xabc' }], 'call 0 has invalid calldata'],
    ['an unparseable value', [{ to: RECIPIENT, data: '0x', value: 'not-a-number' }], 'call 0 has an invalid value'],
    ['a negative value', [{ to: RECIPIENT, data: '0x', value: '-1' }], 'call 0 has an invalid value'],
    [
      'a required per-call capability',
      [{ to: RECIPIENT, data: '0x', capabilities: { paymasterService: { url: 'https://paymaster.example' } } }],
      'call 0 has an unsupported required capability',
    ],
  ])('rejects the whole batch on %s', (_label, calls, expectedReason) => {
    const result = safeNormalizeSendCalls(calls as Call[])

    expect(result.ok).toBe(false)
    expect(result.ok ? undefined : result.reason).toContain(expectedReason)
  })

  it('rejects the whole batch when a later call is unsupported', () => {
    const result = safeNormalizeSendCalls([
      { to: RECIPIENT, data: '0xabcdef' },
      { to: '0x1234', data: '0xabcdef' },
    ])

    expect(result.ok).toBe(false)
    expect(result.ok ? undefined : result.reason).toContain('call 1 has an unsupported recipient')
  })

  it('returns a blocked result for a schema-invalid persisted call instead of throwing', () => {
    const result = safeNormalizeSendCalls([{ to: RECIPIENT, data: null } as unknown as Call])

    expect(result).toEqual({ ok: false, reason: 'wallet_sendCalls call 0 has an unsupported shape' })
  })
})

describe('normalizeSendCalls', () => {
  it('throws so intake paths reject the request instead of prompting', () => {
    expect(() => normalizeSendCalls([{ to: '0x1234', data: '0xabcdef' }])).toThrow(
      new InvalidSendCallsRequestError('wallet_sendCalls call 0 has an unsupported recipient'),
    )
  })

  it('returns the canonical calls for a valid batch', () => {
    expect(normalizeSendCalls([{ to: RECIPIENT, value: '0x1' }])).toEqual([{ to: RECIPIENT, data: '0x', value: '0x1' }])
  })
})
