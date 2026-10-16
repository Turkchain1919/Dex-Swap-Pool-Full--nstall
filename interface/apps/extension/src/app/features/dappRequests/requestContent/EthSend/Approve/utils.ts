import { BigNumber } from '@ethersproject/bignumber'
import { Platform, getValidAddress } from '@universe/chains'

// approve(address,uint256) calldata layout:
// 0x | 8 hex selector | 64 hex address (24 left-pad zeros + 40 hex address) | 64 hex amount
const APPROVE_CALLDATA_LENGTH = 10 + 64 * 2

export function parseSpenderAddress(data: string): string | undefined {
  if (data.length !== APPROVE_CALLDATA_LENGTH) {
    return undefined
  }

  const address = `0x${data.slice(34, 74)}`
  return getValidAddress({ address, platform: Platform.EVM }) ?? undefined
}

function isApproveAmountZero(data: string): boolean {
  if (data.length !== APPROVE_CALLDATA_LENGTH) {
    return false
  }

  try {
    // Read the uint256 amount arg: skip "0x" + selector + address arg (74 chars), take the next 64.
    return BigNumber.from(`0x${data.slice(74, 138)}`).isZero()
  } catch {
    return false
  }
}

export function isApproveRevoke({ value, data }: { value?: string; data?: string }): boolean {
  try {
    // An omitted transaction value is semantically zero, and canonical hex may contain leading zeros.
    return BigNumber.from(value ?? 0).isZero() && isApproveAmountZero(data ?? '')
  } catch {
    return false
  }
}
