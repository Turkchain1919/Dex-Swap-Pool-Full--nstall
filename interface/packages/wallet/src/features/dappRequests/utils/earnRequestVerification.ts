import { areEvmAddressesEqual, erc20Abi, erc4626VaultAbi, type Hex, wethAbi } from '@universe/chains'
import { isValidHexString } from '@universe/encoding'
import { EarnAction, type EarnVaultInfo } from 'uniswap/src/features/earn/types'
import { isWrappedNativeEarnVault } from 'uniswap/src/features/earn/utils'
import { currencyIdToAddress } from 'uniswap/src/utils/currencyId'
import { decodeFunctionData } from 'viem'
import type { DappRequestCall } from 'wallet/src/features/dappRequests/types'

/**
 * The call's native value as a bigint; undefined when unparseable or negative (treated as
 * unverifiable). A negative value would subtract from the conservation sum, so it must fail
 * closed here even though upstream normalization already rejects it.
 */
function parseCallValue(call: DappRequestCall): bigint | undefined {
  // '0x' is a legal JSON-RPC zero spelling that BigInt cannot parse.
  if (!call.value || call.value === '0x') {
    return 0n
  }
  try {
    const value = BigInt(call.value)
    return value < 0n ? undefined : value
  } catch {
    return undefined
  }
}

function decodeApproveSpender(data: Hex): string | undefined {
  try {
    const decoded = decodeFunctionData({ abi: erc20Abi, data })
    return decoded.functionName === 'approve' ? decoded.args[0] : undefined
  } catch {
    return undefined
  }
}

type DecodedVaultCall =
  | { functionName: 'deposit'; assets: bigint; receiver: string }
  | { functionName: 'withdraw'; assets: bigint; receiver: string; owner: string }
  | { functionName: 'redeem'; receiver: string; owner: string }

function decodeVaultCall(data: Hex): DecodedVaultCall | undefined {
  try {
    const decoded = decodeFunctionData({ abi: erc4626VaultAbi, data })
    // Exhaustive switch rather than a fallthrough: the shared ABI may grow entries this
    // allowlist must not silently accept.
    switch (decoded.functionName) {
      case 'deposit':
        return { functionName: 'deposit', assets: decoded.args[0], receiver: decoded.args[1] }
      case 'withdraw':
        return { functionName: 'withdraw', assets: decoded.args[0], receiver: decoded.args[1], owner: decoded.args[2] }
      case 'redeem':
        return { functionName: 'redeem', receiver: decoded.args[1], owner: decoded.args[2] }
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

type DecodedWrappedNativeCall = { functionName: 'deposit' } | { functionName: 'withdraw'; wad: bigint }

function decodeWrappedNativeCall(data: Hex): DecodedWrappedNativeCall | undefined {
  try {
    const decoded = decodeFunctionData({ abi: wethAbi, data })
    switch (decoded.functionName) {
      case 'deposit':
        return { functionName: 'deposit' }
      case 'withdraw':
        return { functionName: 'withdraw', wad: decoded.args[0] }
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

/**
 * Underlying amount the vault call moves (0 for `redeem`, whose shares aren't comparable to
 * underlying without the exchange rate), or undefined when the call is not allowed.
 */
function verifyVaultCall({
  call,
  data,
  account,
  action,
}: {
  call: DappRequestCall
  data: Hex
  account: string
  action: EarnAction
}): bigint | undefined {
  const vaultCall = decodeVaultCall(data)
  if (!vaultCall || parseCallValue(call) !== 0n || !areEvmAddressesEqual(vaultCall.receiver, account)) {
    return undefined
  }
  if (action === EarnAction.Deposit) {
    return vaultCall.functionName === 'deposit' ? vaultCall.assets : undefined
  }
  if (vaultCall.functionName === 'deposit' || !areEvmAddressesEqual(vaultCall.owner, account)) {
    return undefined
  }
  return vaultCall.functionName === 'withdraw' ? vaultCall.assets : 0n
}

/**
 * Native amount the underlying-token call wraps/unwraps (0 for an approval to the vault),
 * or undefined when the call is not allowed.
 */
function verifyUnderlyingCall({
  call,
  data,
  vaultAddress,
  action,
  isWrappedNativeVault,
}: {
  call: DappRequestCall
  data: Hex
  vaultAddress: string
  action: EarnAction
  isWrappedNativeVault: boolean
}): bigint | undefined {
  if (action === EarnAction.Deposit) {
    const spender = decodeApproveSpender(data)
    if (spender && areEvmAddressesEqual(spender, vaultAddress) && parseCallValue(call) === 0n) {
      return 0n
    }
    // The wrap call carries native value legitimately — it becomes the user's own wrapped balance.
    if (isWrappedNativeVault && decodeWrappedNativeCall(data)?.functionName === 'deposit') {
      return parseCallValue(call)
    }
    return undefined
  }
  if (!isWrappedNativeVault || parseCallValue(call) !== 0n) {
    return undefined
  }
  const wrappedCall = decodeWrappedNativeCall(data)
  return wrappedCall?.functionName === 'withdraw' ? wrappedCall.wad : undefined
}

/**
 * The simulation asset diff alone is spoofable: a batched call can mint dust shares to the user
 * while draining the rest of the value elsewhere. Only claim Depositing/Withdrawing when every
 * call is a shape a genuine Earn plan produces — approve the underlying to the vault, the
 * ERC-4626 deposit/withdraw/redeem on the vault with the user as receiver (and owner), and a
 * wrap/unwrap of a wrapped-native underlying. The vault amounts must also cover the total
 * wrapped/unwrapped, or the preview (built from the simulation diff, which counts the full
 * wrap) would overstate the vault action — e.g. wrap 1 ETH but deposit only 2 wei.
 */
export function isVerifiedEarnRequest({
  calls,
  vault,
  account,
  action,
}: {
  calls: readonly DappRequestCall[]
  vault: EarnVaultInfo
  account: string
  action: EarnAction
}): boolean {
  const underlyingAddress = currencyIdToAddress(vault.currencyId)
  const isWrappedNativeVault = isWrappedNativeEarnVault(vault)
  let hasVaultAction = false
  let vaultAssetsTotal = 0n
  let wrappedNativeTotal = 0n

  for (const call of calls) {
    if (!call.to || !call.data || !isValidHexString(call.data)) {
      return false
    }

    if (areEvmAddressesEqual(call.to, vault.vaultAddress)) {
      const movedAssets = verifyVaultCall({ call, data: call.data, account, action })
      if (movedAssets === undefined) {
        return false
      }
      vaultAssetsTotal += movedAssets
      hasVaultAction = true
      continue
    }

    if (areEvmAddressesEqual(call.to, underlyingAddress)) {
      const wrappedAmount = verifyUnderlyingCall({
        call,
        data: call.data,
        vaultAddress: vault.vaultAddress,
        action,
        isWrappedNativeVault,
      })
      if (wrappedAmount === undefined) {
        return false
      }
      wrappedNativeTotal += wrappedAmount
      continue
    }

    return false
  }

  return hasVaultAction && vaultAssetsTotal >= wrappedNativeTotal
}
