import type { TransactionRequest } from '@ethersproject/abstract-provider'
import { BigNumber, type BigNumberish } from '@ethersproject/bignumber'
import { hexlifyTransaction } from 'utilities/src/transactions/hexlifyTransaction'

const APPROVE_CALLDATA =
  '0x095ea7b30000000000000000000000001234567890123456789012345678901234567890ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
const APPROVE_CALLDATA_BYTES = Uint8Array.from(
  APPROVE_CALLDATA.slice(2)
    .match(/.{2}/g)!
    .map((byte) => Number.parseInt(byte, 16)),
)

describe('hexlifyTransaction', () => {
  it('should hexlify all fields correctly', () => {
    const transferTxRequest: TransactionRequest = {
      nonce: 1,
      value: 1000,
      gasLimit: 21000,
      gasPrice: 20000000000,
    }

    const result = hexlifyTransaction(transferTxRequest)

    expect(result).toEqual({
      ...transferTxRequest,
      nonce: '0x01',
      value: '0x03e8',
      gasLimit: '0x5208',
      gasPrice: '0x04a817c800',
    })
  })

  it('should handle EIP-1559 transaction fields', () => {
    const transferTxRequest: TransactionRequest = {
      nonce: 1,
      value: 1000,
      gasLimit: 21000,
      maxPriorityFeePerGas: 1000000000,
      maxFeePerGas: 2000000000,
    }

    const result = hexlifyTransaction(transferTxRequest)

    expect(result).toEqual({
      ...transferTxRequest,
      nonce: '0x01',
      value: '0x03e8',
      gasLimit: '0x5208',
      maxPriorityFeePerGas: '0x3b9aca00',
      maxFeePerGas: '0x77359400',
    })
  })

  it('should return undefined for undefined fields', () => {
    const transferTxRequest: TransactionRequest = {}

    const result = hexlifyTransaction(transferTxRequest)

    expect(result).toEqual({})
  })

  it('normalizes explicit null fields to absent values', () => {
    const result = hexlifyTransaction({
      nonce: null,
      value: null,
      gasLimit: null,
      gasPrice: null,
      maxPriorityFeePerGas: null,
      maxFeePerGas: null,
      data: null,
    } as unknown as TransactionRequest)

    expect(result).toEqual({
      nonce: undefined,
      value: undefined,
      gasLimit: undefined,
      gasPrice: undefined,
      maxPriorityFeePerGas: undefined,
      maxFeePerGas: undefined,
      data: undefined,
    })
    expect(JSON.stringify(result)).toBe('{}')
  })

  it('handle zero values', () => {
    const transferTxRequest: TransactionRequest = {
      nonce: 0,
      value: 0,
      gasLimit: 0,
      maxPriorityFeePerGas: 0,
      maxFeePerGas: 0,
    }

    const result = hexlifyTransaction(transferTxRequest)

    expect(result).toEqual({
      ...transferTxRequest,
      nonce: '0x00',
      value: '0x00',
      gasLimit: '0x00',
      maxPriorityFeePerGas: '0x00',
      maxFeePerGas: '0x00',
    })
  })

  it('canonicalizes JSON-serializable byte arrays', () => {
    const result = hexlifyTransaction({
      nonce: [1],
      value: [13, 224, 182, 179, 167, 100, 0, 0],
      gasLimit: [0x52, 0x08],
      gasPrice: [1],
      maxPriorityFeePerGas: [2],
      maxFeePerGas: [3],
    })

    expect(result).toEqual({
      nonce: '0x01',
      value: '0x0de0b6b3a7640000',
      gasLimit: '0x5208',
      gasPrice: '0x01',
      maxPriorityFeePerGas: '0x02',
      maxFeePerGas: '0x03',
    })
  })

  it('canonicalizes either EIP-1559 fee field independently', () => {
    expect(hexlifyTransaction({ maxPriorityFeePerGas: [2] })).toEqual({
      maxPriorityFeePerGas: '0x02',
    })
    expect(hexlifyTransaction({ maxFeePerGas: [3] })).toEqual({
      maxFeePerGas: '0x03',
    })
  })

  it('converges calldata representations to the same lowercase hex string', () => {
    const uppercaseCalldata = `0x${APPROVE_CALLDATA.slice(2).toUpperCase()}`
    const representations = [uppercaseCalldata, [...APPROVE_CALLDATA_BYTES], APPROVE_CALLDATA_BYTES]

    for (const data of representations) {
      expect(hexlifyTransaction({ data }).data).toBe(APPROVE_CALLDATA)
    }
  })

  it.each([256, -1, 1.5])('rejects invalid calldata bytes: %s', (byte) => {
    const data = [byte] as unknown as TransactionRequest['data']
    expect(() => hexlifyTransaction({ data })).toThrow('Transaction data must be a valid byte sequence')
  })

  it('rejects non-byte-array calldata objects', () => {
    expect(() => hexlifyTransaction({ data: { unsupported: true } as unknown as TransactionRequest['data'] })).toThrow(
      'Transaction data must be a valid byte sequence',
    )
  })

  it('converges every supported zero representation to the same hex value', () => {
    const serializedBigNumber = JSON.parse(JSON.stringify(BigNumber.from(0))) as unknown as BigNumberish
    const representations: BigNumberish[] = [
      0,
      '0',
      '0x0',
      [0],
      new Uint8Array([0]),
      0n,
      BigNumber.from(0),
      serializedBigNumber,
    ]

    for (const value of representations) {
      expect(hexlifyTransaction({ value }).value).toBe('0x00')
    }
  })

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects an invalid transaction quantity: %s', (value) => {
    expect(() => hexlifyTransaction({ value })).toThrow()
  })
})
