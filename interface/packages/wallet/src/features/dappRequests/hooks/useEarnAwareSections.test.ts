import { type Address, erc20Abi, erc4626VaultAbi, UniverseChainId, wethAbi } from '@universe/chains'
import { getWrappedNativeAddressWithThrow } from 'uniswap/src/constants/addresses'
import type { EarnVaultInfo } from 'uniswap/src/features/earn/types'
import { buildCurrencyId, buildNativeCurrencyId } from 'uniswap/src/utils/currencyId'
import { encodeFunctionData, maxUint256 } from 'viem'
import { deriveEarnAwareSections } from 'wallet/src/features/dappRequests/hooks/useEarnAwareSections'
import {
  type DappRequestCall,
  type TransactionAsset,
  type TransactionSection,
  TransactionSectionType,
} from 'wallet/src/features/dappRequests/types'

const CHAIN_ID = UniverseChainId.Mainnet
const VAULT_ADDRESS = '0x1111111111111111111111111111111111111111' // ERC-4626 share token (e.g. GTUSDCP)
const USDC_ADDRESS = '0x2222222222222222222222222222222222222222' // underlying
// The chain's real wrapped-native address — isWrappedNativeEarnVault checks against it.
const WETH_ADDRESS = getWrappedNativeAddressWithThrow(CHAIN_ID)
const ACCOUNT = '0x4444444444444444444444444444444444444444'
const ATTACKER = '0x5555555555555555555555555555555555555555'
const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11'

const VAULT: EarnVaultInfo = {
  id: `${CHAIN_ID}-${VAULT_ADDRESS}`,
  currencyId: buildCurrencyId(CHAIN_ID, USDC_ADDRESS),
  displayCurrencyId: buildCurrencyId(CHAIN_ID, USDC_ADDRESS),
  vaultAddress: VAULT_ADDRESS,
  chainId: CHAIN_ID,
  apyPercent: 4.52,
  exposureCurrencyIds: [],
  exposures: [],
  totalDepositsUsd: 0,
  liquidityUsd: 0,
  curator: { name: 'Test', imageUrl: '' },
}

const WRAPPED_NATIVE_VAULT: EarnVaultInfo = {
  ...VAULT,
  currencyId: buildCurrencyId(CHAIN_ID, WETH_ADDRESS),
  displayCurrencyId: buildNativeCurrencyId(CHAIN_ID),
}

const approveCall = (spender: string = VAULT_ADDRESS): DappRequestCall => ({
  to: USDC_ADDRESS,
  data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender as Address, maxUint256] }),
})
const depositCall = (receiver: string = ACCOUNT, assets: bigint = 5_000_000n): DappRequestCall => ({
  to: VAULT_ADDRESS,
  data: encodeFunctionData({
    abi: erc4626VaultAbi,
    functionName: 'deposit',
    args: [assets, receiver as Address],
  }),
})
const withdrawCall = (
  receiver: string = ACCOUNT,
  owner: string = ACCOUNT,
  assets: bigint = 5_000_000n,
): DappRequestCall => ({
  to: VAULT_ADDRESS,
  data: encodeFunctionData({
    abi: erc4626VaultAbi,
    functionName: 'withdraw',
    args: [assets, receiver as Address, owner as Address],
  }),
})
const redeemCall = (
  receiver: string = ACCOUNT,
  owner: string = ACCOUNT,
  shares: bigint = 5_000_000n,
): DappRequestCall => ({
  to: VAULT_ADDRESS,
  data: encodeFunctionData({
    abi: erc4626VaultAbi,
    functionName: 'redeem',
    args: [shares, receiver as Address, owner as Address],
  }),
})
const ONE_ETH = 10n ** 18n
const wrapCall = (value: bigint = ONE_ETH): DappRequestCall => ({
  to: WETH_ADDRESS,
  data: encodeFunctionData({ abi: wethAbi, functionName: 'deposit' }),
  value: `0x${value.toString(16)}`,
})
const unwrapCall = (wad: bigint = ONE_ETH): DappRequestCall => ({
  to: WETH_ADDRESS,
  data: encodeFunctionData({ abi: wethAbi, functionName: 'withdraw', args: [wad] }),
})

function asset(address: string): TransactionAsset {
  return { type: 'ERC20', address, chainId: CHAIN_ID, symbol: 'TKN', amount: '5', usdValue: '5' }
}

const sending = (address: string): TransactionSection => ({
  type: TransactionSectionType.Sending,
  assets: [asset(address)],
})
const receiving = (address: string): TransactionSection => ({
  type: TransactionSectionType.Receiving,
  assets: [asset(address)],
})
const approving = (address: string): TransactionSection => ({
  type: TransactionSectionType.Approving,
  assets: [asset(address)],
})

function derive({
  sections,
  calls,
  vaults = [VAULT],
}: {
  sections: TransactionSection[]
  calls: DappRequestCall[] | undefined
  vaults?: EarnVaultInfo[]
}): TransactionSection[] {
  return deriveEarnAwareSections({ sections, chainId: CHAIN_ID, vaults, account: ACCOUNT, calls })
}

describe('deriveEarnAwareSections', () => {
  it('collapses a deposit (receives share token) into a Depositing section with APY, preserving the approval', () => {
    const sections = [approving(USDC_ADDRESS), sending(USDC_ADDRESS), receiving(VAULT_ADDRESS)]

    const result = derive({ sections, calls: [approveCall(), depositCall()] })

    expect(result).toHaveLength(2)
    // The approval row is kept so the user still sees it.
    expect(result[0]?.type).toBe(TransactionSectionType.Approving)
    expect(result[1]?.type).toBe(TransactionSectionType.Depositing)
    expect(result[1]?.apyPercent).toBe(4.52)
    // Depositing shows the underlying being sent, not the share token received.
    expect(result[1]?.assets[0]?.address).toBe(USDC_ADDRESS)
  })

  it('collapses a deposit with no approval into a single Depositing section', () => {
    const sections = [sending(USDC_ADDRESS), receiving(VAULT_ADDRESS)]

    const result = derive({ sections, calls: [depositCall()] })

    expect(result).toHaveLength(1)
    expect(result[0]?.type).toBe(TransactionSectionType.Depositing)
  })

  it("keeps the label when zero value is spelled as the JSON-RPC '0x'", () => {
    const sections = [sending(USDC_ADDRESS), receiving(VAULT_ADDRESS)]

    const result = derive({ sections, calls: [{ ...depositCall(), value: '0x' }] })

    expect(result[0]?.type).toBe(TransactionSectionType.Depositing)
  })

  it('collapses a withdraw (sends share token) into a Withdrawing section without APY', () => {
    const sections = [sending(VAULT_ADDRESS), receiving(USDC_ADDRESS)]

    const result = derive({ sections, calls: [withdrawCall()] })

    expect(result).toHaveLength(1)
    expect(result[0]?.type).toBe(TransactionSectionType.Withdrawing)
    expect(result[0]?.apyPercent).toBeUndefined()
    // Withdrawing shows the underlying being received.
    expect(result[0]?.assets[0]?.address).toBe(USDC_ADDRESS)
  })

  it('collapses a redeem into a Withdrawing section', () => {
    const sections = [sending(VAULT_ADDRESS), receiving(USDC_ADDRESS)]

    const result = derive({ sections, calls: [redeemCall()] })

    expect(result[0]?.type).toBe(TransactionSectionType.Withdrawing)
  })

  it('collapses a wrapped-native deposit batch (wrap + approve + deposit) into a Depositing section', () => {
    const sections = [sending(WETH_ADDRESS), receiving(VAULT_ADDRESS)]
    const approveWeth: DappRequestCall = {
      to: WETH_ADDRESS,
      data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [VAULT_ADDRESS, maxUint256] }),
    }

    const result = derive({
      sections,
      calls: [wrapCall(ONE_ETH), approveWeth, depositCall(ACCOUNT, ONE_ETH)],
      vaults: [WRAPPED_NATIVE_VAULT],
    })

    expect(result[0]?.type).toBe(TransactionSectionType.Depositing)
  })

  it('collapses a wrapped-native withdraw batch (withdraw + unwrap) into a Withdrawing section', () => {
    const sections = [sending(VAULT_ADDRESS), receiving(WETH_ADDRESS)]

    const result = derive({
      sections,
      calls: [withdrawCall(ACCOUNT, ACCOUNT, ONE_ETH), unwrapCall(ONE_ETH)],
      vaults: [WRAPPED_NATIVE_VAULT],
    })

    expect(result[0]?.type).toBe(TransactionSectionType.Withdrawing)
  })

  it('leaves non-Earn transactions untouched', () => {
    const sections = [sending(USDC_ADDRESS), receiving(USDC_ADDRESS)]

    const result = derive({ sections, calls: [depositCall()] })

    expect(result).toBe(sections)
  })

  it('returns sections unchanged when no vaults are loaded', () => {
    const sections = [sending(USDC_ADDRESS), receiving(VAULT_ADDRESS)]

    const result = derive({ sections, calls: [depositCall()], vaults: [] })

    expect(result).toBe(sections)
  })

  it('does not collapse a deposit when there is no underlying being sent', () => {
    const sections = [receiving(VAULT_ADDRESS)]

    const result = derive({ sections, calls: [depositCall()] })

    expect(result).toBe(sections)
  })

  // The simulation diff alone (share token in, value out) must not be trusted — the calldata
  // has to prove the request only interacts with the vault.
  describe('spoofed requests fall back to the generic preview', () => {
    const depositLikeSections = [sending(USDC_ADDRESS), receiving(VAULT_ADDRESS)]

    it('rejects a Multicall3 transaction that mints dust shares while draining the rest', () => {
      const multicall: DappRequestCall = { to: MULTICALL3, data: '0xdeadbeef', value: '0xde0b6b3a7640000' }

      expect(derive({ sections: depositLikeSections, calls: [multicall] })).toBe(depositLikeSections)
    })

    it('rejects a batch that adds a drain call alongside a genuine deposit', () => {
      const drain: DappRequestCall = { to: ATTACKER, data: '0x', value: '0xde0b6b3a7640000' }

      expect(derive({ sections: depositLikeSections, calls: [approveCall(), depositCall(), drain] })).toBe(
        depositLikeSections,
      )
    })

    it('rejects a deposit whose shares are minted to someone else', () => {
      expect(derive({ sections: depositLikeSections, calls: [depositCall(ACCOUNT), depositCall(ATTACKER)] })).toBe(
        depositLikeSections,
      )
    })

    it('rejects a transfer call on the underlying token', () => {
      const transferCall: DappRequestCall = {
        to: USDC_ADDRESS,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [ATTACKER as Address, 5_000_000n],
        }),
      }

      expect(derive({ sections: depositLikeSections, calls: [transferCall, depositCall()] })).toBe(depositLikeSections)
    })

    it('rejects an approval of the underlying to a spender other than the vault', () => {
      expect(derive({ sections: depositLikeSections, calls: [approveCall(ATTACKER), depositCall()] })).toBe(
        depositLikeSections,
      )
    })

    it('rejects a vault call that attaches native value', () => {
      const depositWithValue: DappRequestCall = { ...depositCall(), value: '0xde0b6b3a7640000' }

      expect(derive({ sections: depositLikeSections, calls: [depositWithValue] })).toBe(depositLikeSections)
    })

    it('rejects a plain transfer to the vault with no calldata', () => {
      const bareCall: DappRequestCall = { to: VAULT_ADDRESS, value: '0xde0b6b3a7640000' }

      expect(derive({ sections: depositLikeSections, calls: [bareCall] })).toBe(depositLikeSections)
    })

    it('rejects a wrap call when the vault underlying is not wrapped native', () => {
      const wrapUnderlyingCall: DappRequestCall = { ...wrapCall(ONE_ETH), to: USDC_ADDRESS }

      expect(derive({ sections: depositLikeSections, calls: [wrapUnderlyingCall, depositCall()] })).toBe(
        depositLikeSections,
      )
    })

    it('rejects a deposit that covers only part of the wrapped amount', () => {
      const wrappedDepositSections = [sending(WETH_ADDRESS), receiving(VAULT_ADDRESS)]

      const result = derive({
        sections: wrappedDepositSections,
        calls: [wrapCall(ONE_ETH), depositCall(ACCOUNT, 2n)],
        vaults: [WRAPPED_NATIVE_VAULT],
      })

      expect(result).toBe(wrappedDepositSections)
    })

    it('rejects an unwrap that exceeds the withdrawn amount', () => {
      const wrappedWithdrawSections = [sending(VAULT_ADDRESS), receiving(WETH_ADDRESS)]

      const result = derive({
        sections: wrappedWithdrawSections,
        calls: [withdrawCall(ACCOUNT, ACCOUNT, 2n), unwrapCall(ONE_ETH)],
        vaults: [WRAPPED_NATIVE_VAULT],
      })

      expect(result).toBe(wrappedWithdrawSections)
    })

    it('rejects a redeem paired with an unwrap (conservation unprovable)', () => {
      const wrappedWithdrawSections = [sending(VAULT_ADDRESS), receiving(WETH_ADDRESS)]

      const result = derive({
        sections: wrappedWithdrawSections,
        calls: [redeemCall(ACCOUNT, ACCOUNT, ONE_ETH), unwrapCall(ONE_ETH)],
        vaults: [WRAPPED_NATIVE_VAULT],
      })

      expect(result).toBe(wrappedWithdrawSections)
    })

    it('rejects an ERC-20 call on the vault address itself (share-token exfiltration)', () => {
      const approveShares: DappRequestCall = {
        to: VAULT_ADDRESS,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [ATTACKER as Address, maxUint256],
        }),
      }

      expect(derive({ sections: depositLikeSections, calls: [depositCall(), approveShares] })).toBe(depositLikeSections)
    })

    it('rejects a batch whose calls all verify but contain no vault action', () => {
      expect(derive({ sections: depositLikeSections, calls: [approveCall()] })).toBe(depositLikeSections)
    })

    it('rejects a wrap call with a negative value', () => {
      const wrappedDepositSections = [sending(WETH_ADDRESS), receiving(VAULT_ADDRESS)]
      const negativeWrap: DappRequestCall = { ...wrapCall(ONE_ETH), value: `-${ONE_ETH.toString()}` }

      // Deposit covers the (positive) wrap, so the negative value is the only thing that can
      // reject the batch — a fail-open regression in parseCallValue would turn this green.
      const result = derive({
        sections: wrappedDepositSections,
        calls: [wrapCall(ONE_ETH), negativeWrap, depositCall(ACCOUNT, ONE_ETH)],
        vaults: [WRAPPED_NATIVE_VAULT],
      })

      expect(result).toBe(wrappedDepositSections)
    })

    it('rejects requests when no calls are available to verify', () => {
      expect(derive({ sections: depositLikeSections, calls: undefined })).toBe(depositLikeSections)
      expect(derive({ sections: depositLikeSections, calls: [] })).toBe(depositLikeSections)
    })

    it('rejects a withdraw that sends the redeemed assets to someone else', () => {
      const withdrawLikeSections = [sending(VAULT_ADDRESS), receiving(USDC_ADDRESS)]

      expect(derive({ sections: withdrawLikeSections, calls: [withdrawCall(), withdrawCall(ATTACKER)] })).toBe(
        withdrawLikeSections,
      )
    })

    it('rejects a deposit-shaped preview whose only vault call is a withdraw', () => {
      expect(derive({ sections: depositLikeSections, calls: [withdrawCall()] })).toBe(depositLikeSections)
    })
  })
})
