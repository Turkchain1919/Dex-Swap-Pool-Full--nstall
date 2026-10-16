import type { TransactionRequest } from '@ethersproject/abstract-provider'
import type { BigNumberish } from '@ethersproject/bignumber'
import { BigNumber } from '@ethersproject/bignumber'
import { uint8ToHex } from '@universe/encoding'

type NumericTransactionField = 'nonce' | 'value' | 'gasLimit' | 'gasPrice' | 'maxPriorityFeePerGas' | 'maxFeePerGas'

export type HexlifiedTransactionRequest<T extends TransactionRequest = TransactionRequest> = Omit<
  T,
  NumericTransactionField | 'data'
> &
  Partial<Record<NumericTransactionField | 'data', string>>

function formatAsHexString(input?: BigNumberish | null): string | undefined {
  if (input == null) {
    return undefined
  }

  const value = BigNumber.from(input)
  if (value.isNegative()) {
    throw new Error('Transaction numeric fields must be unsigned')
  }
  return value.toHexString()
}

function formatDataAsHexString(input: TransactionRequest['data'] | null): string | undefined {
  if (input == null) {
    return undefined
  }

  if (typeof input === 'string') {
    if (!input.startsWith('0x') || input.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(input.slice(2))) {
      throw new Error('Transaction data must be a valid byte sequence')
    }
    return input.toLowerCase()
  }

  if (!Array.isArray(input) && !(input instanceof Uint8Array)) {
    throw new Error('Transaction data must be a valid byte sequence')
  }

  const bytes = Array.from(input)
  if (bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    throw new Error('Transaction data must be a valid byte sequence')
  }
  return `0x${uint8ToHex(Uint8Array.from(bytes))}`
}

/**
 * Normalizes transaction quantities and calldata to hex strings.
 *
 * This is useful for converting a transaction request to a hex string for use in a DApp request if for some
 * reason the target fields are not already in hex format.
 *
 * This function is idempotent so it's safe to call more than once on a singular transaction request
 *
 * @throws When a provided numeric field is not an unsigned EVM quantity or calldata is not a valid byte sequence.
 */
export function hexlifyTransaction<T extends TransactionRequest>(transferTxRequest: T): HexlifiedTransactionRequest<T> {
  const { value, nonce, gasLimit, gasPrice, maxPriorityFeePerGas, maxFeePerGas, data } = transferTxRequest
  return {
    ...transferTxRequest,
    ...(data !== undefined ? { data: formatDataAsHexString(data) } : {}),
    ...(nonce !== undefined ? { nonce: formatAsHexString(nonce) } : {}),
    ...(value !== undefined ? { value: formatAsHexString(value) } : {}),
    ...(gasLimit !== undefined ? { gasLimit: formatAsHexString(gasLimit) } : {}),

    // only pass in for legacy chains
    ...(gasPrice !== undefined ? { gasPrice: formatAsHexString(gasPrice) } : {}),

    ...(maxPriorityFeePerGas !== undefined ? { maxPriorityFeePerGas: formatAsHexString(maxPriorityFeePerGas) } : {}),
    ...(maxFeePerGas !== undefined ? { maxFeePerGas: formatAsHexString(maxFeePerGas) } : {}),
  }
}
