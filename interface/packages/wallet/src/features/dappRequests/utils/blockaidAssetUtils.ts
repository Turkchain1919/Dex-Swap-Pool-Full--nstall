import { getNativeAddress } from 'uniswap/src/constants/addresses'
import { isUniverseChainId } from 'uniswap/src/features/chains/utils'

export const MAX_DECIMAL_PLACES = 6

/**
 * Rounds a numeric value to a maximum of 6 decimal places.
 * Preserves non-zero values that would otherwise round to zero.
 */
export function roundToDecimals(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return String(value)
  }

  const rounded = parseFloat(numValue.toFixed(MAX_DECIMAL_PLACES))

  if (rounded === 0 && numValue !== 0) {
    return numValue.toFixed(MAX_DECIMAL_PLACES + 14).replace(/\.?0+$/, '')
  }

  return String(rounded)
}

/** Returns Blockaid's contract address, or the canonical native address on supported chains. */
export function getAssetAddress(asset: { type: string; chain_id?: number; address?: string }): string {
  // Blockaid's chain_id is unvalidated input; an out-of-enum id would crash getNativeAddress.
  if (asset.type === 'NATIVE' && isUniverseChainId(asset.chain_id)) {
    return getNativeAddress(asset.chain_id)
  }
  return asset.address || ''
}
