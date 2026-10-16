import { parseHex } from '@universe/encoding'
import { formatUnits } from 'viem'
import { MAX_DECIMAL_PLACES } from 'wallet/src/features/dappRequests/utils/blockaidAssetUtils'

// Conservative whole-token fallback for non-standard sentinels; standard max-integer approvals
// are detected by their raw bit patterns below.
const LARGE_APPROVAL_TOKEN_THRESHOLD = 1e24
// Permit-style approvals commonly cap amounts at uint96 max; smaller all-f values remain finite.
const MIN_UNLIMITED_ALL_F_APPROVAL = 2n ** 96n - 1n
const MAX_RELIABLE_NUMBER_DIGITS = 15

export function parseApprovalQuantity(approval: string | undefined): bigint | undefined {
  if (!approval) {
    return undefined
  }

  try {
    return BigInt(parseHex(approval))
  } catch {
    return undefined
  }
}

/**
 * Unlike roundToDecimals (used by transfer rows), this truncates at MAX_DECIMAL_PLACES so the UI
 * never displays an approval greater than the exact allowance.
 */
export function formatApprovalAmount(quantity: bigint | undefined, decimals: number): string | undefined {
  if (quantity === undefined) {
    return undefined
  }

  try {
    const formatted = formatUnits(quantity, decimals)
    const [wholePart = '0', fractionalPart] = formatted.split('.')
    // More than 15 whole-number digits exhausts the reliable decimal precision of the downstream
    // Number-based locale formatter, so omit fractional digits it cannot preserve.
    if (wholePart.length > MAX_RELIABLE_NUMBER_DIGITS) {
      return wholePart
    }
    if (!fractionalPart) {
      return wholePart
    }

    const trimmedFractional = fractionalPart.slice(0, MAX_DECIMAL_PLACES).replace(/0+$/, '')
    if (trimmedFractional) {
      return `${wholePart}.${trimmedFractional}`
    }

    // Keep a tiny nonzero grant distinguishable from a zero-value revoke. The locale formatter
    // turns this exact value into its small-number display (for example, "<0.001").
    return wholePart === '0' && quantity > 0n ? formatted : wholePart
  } catch {
    return undefined
  }
}

export function isUnlimitedApproval({
  quantity,
  decimals,
}: {
  quantity: bigint | undefined
  decimals?: number
}): boolean {
  if (quantity === undefined) {
    return false
  }

  const hexDigits = quantity.toString(16)

  if (quantity >= MIN_UNLIMITED_ALL_F_APPROVAL && /^f+$/.test(hexDigits)) {
    return true
  }

  if (hexDigits.length >= 40) {
    const fCount = hexDigits.match(/^f+/)?.[0]?.length || 0
    if (fCount / hexDigits.length > 0.9) {
      return true
    }
  }

  if (decimals === undefined) {
    return false
  }

  try {
    const numericValue = parseFloat(formatUnits(quantity, decimals))
    return !isNaN(numericValue) && numericValue >= LARGE_APPROVAL_TOKEN_THRESHOLD
  } catch {
    return false
  }
}
