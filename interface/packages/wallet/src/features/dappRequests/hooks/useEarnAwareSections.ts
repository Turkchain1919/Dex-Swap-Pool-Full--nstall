import type { UniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { EARN_SUPPORTED_CHAIN_IDS } from 'uniswap/src/features/earn/constants'
import { useEarnVaults } from 'uniswap/src/features/earn/hooks/useEarnVaults'
import { selectVaultByShareToken } from 'uniswap/src/features/earn/hooks/useTokenDetailsVaultShareData'
import { EarnAction, type EarnVaultInfo } from 'uniswap/src/features/earn/types'
import { buildCurrencyId } from 'uniswap/src/utils/currencyId'
import { logger } from 'utilities/src/logger/logger'
import {
  type DappRequestCall,
  type TransactionAsset,
  type TransactionSection,
  TransactionSectionType,
} from 'wallet/src/features/dappRequests/types'
import { isVerifiedEarnRequest } from 'wallet/src/features/dappRequests/utils/earnRequestVerification'

function getSection(sections: TransactionSection[], type: TransactionSectionType): TransactionSection | undefined {
  return sections.find((section) => section.type === type)
}

function getCurrencyIds(assets: TransactionAsset[] | undefined, chainId: UniverseChainId): string[] {
  return (assets ?? []).filter((asset) => asset.address).map((asset) => buildCurrencyId(chainId, asset.address))
}

// An Earn-shaped asset diff whose calldata fails verification is either a spoof attempt in the
// wild or TAPI plan-shape drift silently degrading the Earn label — surface both. Dedupe on the
// exact request (vault/action + call batch): scan polling rebuilds `sections`/`calls` identity
// and would re-emit the same request every poll, but a benign Earn-shaped diff (e.g. a DEX swap
// into a share token) must not consume the slot and mask a later distinct spoof on the same vault.
const loggedUnverifiedRequests = new Set<string>()

function logUnverifiedEarnRequest({
  vault,
  action,
  calls,
}: {
  vault: EarnVaultInfo
  action: EarnAction
  calls: readonly DappRequestCall[]
}): void {
  const callsDigest = calls.map((call) => `${call.to ?? ''}:${call.value ?? ''}:${call.data ?? ''}`).join('|')
  const key = `${vault.chainId}-${vault.vaultAddress}-${action}-${callsDigest}`
  if (loggedUnverifiedRequests.has(key)) {
    return
  }
  loggedUnverifiedRequests.add(key)
  logger.warn(
    'useEarnAwareSections',
    'deriveEarnAwareSections',
    'Earn-shaped asset diff failed calldata verification',
    {
      vaultAddress: vault.vaultAddress,
      chainId: vault.chainId,
      action,
    },
  )
}

/**
 * Detection: replace the generic Sending/Receiving rows with a single Earn Depositing
 * (+ Earning APY) or Withdrawing row when the asset diffs match a known vault and the calldata
 * verifies via {@link isVerifiedEarnRequest}. Any Approving rows (e.g. the ERC-20 approval to
 * the vault) are preserved so the user still sees them. A deposit receives the vault's ERC-4626
 * share token (e.g. GTUSDCP) while sending the underlying; a withdraw sends the share token and
 * receives the underlying. Returns `sections` unchanged otherwise.
 */
export function deriveEarnAwareSections({
  sections,
  chainId,
  vaults,
  account,
  calls,
}: {
  sections: TransactionSection[]
  chainId: UniverseChainId
  vaults: readonly EarnVaultInfo[]
  account: string
  calls: readonly DappRequestCall[] | undefined
}): TransactionSection[] {
  if (vaults.length === 0 || !calls || calls.length === 0) {
    return sections
  }

  const receivingAssets = getSection(sections, TransactionSectionType.Receiving)?.assets
  const sendingAssets = getSection(sections, TransactionSectionType.Sending)?.assets
  const receivedCurrencyIds = getCurrencyIds(receivingAssets, chainId)
  const sentCurrencyIds = getCurrencyIds(sendingAssets, chainId)
  const approvingSections = sections.filter((section) => section.type === TransactionSectionType.Approving)

  // Deposit: the received token is a vault share token; the deposited asset is what's being sent.
  const depositVault = selectVaultByShareToken({ tokenCurrencyIds: receivedCurrencyIds, vaults })
  if (depositVault && sendingAssets?.length) {
    if (isVerifiedEarnRequest({ calls, vault: depositVault, account, action: EarnAction.Deposit })) {
      return [
        ...approvingSections,
        {
          type: TransactionSectionType.Depositing,
          assets: sendingAssets,
          apyPercent: depositVault.apyPercent,
        },
      ]
    }
    logUnverifiedEarnRequest({ vault: depositVault, action: EarnAction.Deposit, calls })
  }

  // Withdraw: the sent token is a vault share token; the withdrawn asset is what's being received.
  const withdrawVault = selectVaultByShareToken({ tokenCurrencyIds: sentCurrencyIds, vaults })
  if (withdrawVault && receivingAssets?.length) {
    if (isVerifiedEarnRequest({ calls, vault: withdrawVault, account, action: EarnAction.Withdraw })) {
      return [
        ...approvingSections,
        {
          type: TransactionSectionType.Withdrawing,
          assets: receivingAssets,
        },
      ]
    }
    logUnverifiedEarnRequest({ vault: withdrawVault, action: EarnAction.Withdraw, calls })
  }

  return sections
}

/**
 * Makes the dapp transaction-request preview Earn-aware. Limited to Earn-supported chains;
 * fetches the vault list (vaults-only, no positions) and delegates the detection to
 * {@link deriveEarnAwareSections}.
 */
export function useEarnAwareSections({
  sections,
  chainId,
  account,
  calls,
}: {
  sections: TransactionSection[]
  chainId: UniverseChainId
  account: string
  calls: readonly DappRequestCall[] | undefined
}): TransactionSection[] {
  const chainSupported = EARN_SUPPORTED_CHAIN_IDS.includes(chainId)
  const enabled = chainSupported && sections.length > 0

  // Vaults-only fetch (no account → positions query stays disabled).
  const { vaults } = useEarnVaults({ enabled })

  return useMemo(
    () => (enabled ? deriveEarnAwareSections({ sections, chainId, vaults, account, calls }) : sections),
    [enabled, sections, chainId, vaults, account, calls],
  )
}
