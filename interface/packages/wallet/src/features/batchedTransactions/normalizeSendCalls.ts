import { type Address, type Hex, Platform, getValidAddress } from '@universe/chains'
import { ensure0xHex, isValidHexString } from '@universe/encoding'
import { CallSchema, type Call } from 'wallet/src/features/dappRequests/types'

export interface NormalizedSendCall {
  to: Address
  data: Hex
  value?: Hex
}

export type NormalizeSendCallsResult = { ok: true; calls: NormalizedSendCall[] } | { ok: false; reason: string }

/** Payload-free normalization error whose stable reason is safe to include in telemetry. */
export class InvalidSendCallsRequestError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'InvalidSendCallsRequestError'
  }
}

/**
 * Produces the one call representation used for scanning and execution, or the reason the batch
 * can't be represented at all.
 *
 * The app does not currently support contract creation or per-call capabilities in
 * wallet_sendCalls. Reject those shapes atomically instead of scanning one batch and
 * silently executing a filtered or otherwise different batch.
 */
export function safeNormalizeSendCalls(calls: readonly Call[]): NormalizeSendCallsResult {
  if (calls.length === 0) {
    return { ok: false, reason: 'wallet_sendCalls must contain at least one call' }
  }

  const normalized: NormalizedSendCall[] = []

  for (const [index, rawCall] of calls.entries()) {
    // Zod strips Extension-only preview metadata such as functionSignature and
    // parsedCalldata before the call crosses the Blockaid boundary.
    const parsedCall = CallSchema.safeParse(rawCall)
    if (!parsedCall.success) {
      return { ok: false, reason: `wallet_sendCalls call ${index} has an unsupported shape` }
    }
    const { to, data, value, capabilities } = parsedCall.data

    // Non-strict so a dapp that sends an all-lowercase or mis-checksummed address isn't refused
    // outright — this validates the shape the scan and the encoder both need, not the checksum.
    if (!to || !isValidHexString(to) || !getValidAddress({ address: to, platform: Platform.EVM })) {
      return { ok: false, reason: `wallet_sendCalls call ${index} has an unsupported recipient` }
    }

    // A plain ETH transfer often carries data:'' — treat empty calldata as '0x' rather than reject.
    const callData = data === '' ? '0x' : data
    if (callData !== undefined && ((callData !== '0x' && !isValidHexString(callData)) || callData.length % 2 !== 0)) {
      return { ok: false, reason: `wallet_sendCalls call ${index} has invalid calldata` }
    }

    // Canonicalize value to a hex quantity: a dapp/library emitting a decimal string is coerced
    // rather than rejected (which also improves what the scan sees). Only a genuinely unparseable
    // value is refused.
    let callValue: Hex | undefined
    if (value !== undefined) {
      if (value === '0x' || isValidHexString(value)) {
        callValue = value
      } else {
        let numericValue: bigint
        try {
          numericValue = BigInt(value)
        } catch {
          return { ok: false, reason: `wallet_sendCalls call ${index} has an invalid value` }
        }
        if (numericValue < 0n) {
          return { ok: false, reason: `wallet_sendCalls call ${index} has an invalid value` }
        }
        callValue = ensure0xHex(numericValue.toString(16))
      }
    }

    // EIP-5792: ignore per-call capabilities marked `optional: true` that the wallet doesn't
    // support; only a required (non-optional) capability we can't honor rejects the batch.
    // Capabilities are never forwarded downstream (NormalizedSendCall omits them), so dropping
    // optional ones is safe.
    const hasRequiredCapability =
      capabilities !== undefined && Object.values(capabilities).some((capability) => capability['optional'] !== true)
    if (hasRequiredCapability) {
      return { ok: false, reason: `wallet_sendCalls call ${index} has an unsupported required capability` }
    }

    normalized.push({
      to,
      data: callData ?? '0x',
      // Some encoders emit a bare '0x' for zero, which isHex accepts but is not a valid
      // JSON-RPC quantity for either the scan or the Trading API.
      ...(callValue !== undefined && { value: callValue === '0x' ? '0x0' : callValue }),
    })
  }

  return { ok: true, calls: normalized }
}

/**
 * Throwing form of {@link safeNormalizeSendCalls} for intake paths, where an unsupported batch
 * must reject the request rather than reach a confirmation screen.
 */
export function normalizeSendCalls(calls: readonly Call[]): NormalizedSendCall[] {
  const result = safeNormalizeSendCalls(calls)
  if (!result.ok) {
    throw new InvalidSendCallsRequestError(result.reason)
  }
  return result.calls
}
