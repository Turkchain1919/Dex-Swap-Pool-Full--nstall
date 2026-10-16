import { UniverseChainId } from '@universe/chains'
import type { PublicClient } from 'viem'
import type { RpcUserOperation } from 'viem/account-abstraction'
import type { DelegationCheckResult } from 'wallet/src/features/smartWallet/delegation/types'
import type { Provider } from 'wallet/src/features/transactions/executeTransaction/services/providerService'
import type { PaymasterClient } from 'wallet/src/features/transactions/executeTransaction/services/UserOpSignerService/paymasterClient'
import { createBundledDelegationUserOpSignerService } from 'wallet/src/features/transactions/executeTransaction/services/UserOpSignerService/userOpSignerServiceImpl'
import type { SignerManager } from 'wallet/src/features/wallet/signing/SignerManager'
import { ACCOUNT } from 'wallet/src/test/fixtures'

const mockSignTypedData = vi.fn()

vi.mock('uniswap/src/features/transactions/signing', () => ({
  signTypedData: (...args: unknown[]) => mockSignTypedData(...args),
}))

// A RpcUserOperation carries no chain. The caller says which chain it was prepared for, and the
// signer must refuse when the client it signs through reports a different one.
describe('createBundledDelegationUserOpSignerService.signUserOp', () => {
  const mockGetChainId = vi.fn()
  const mockSigner = { connect: vi.fn() }
  const mockSignerManager = {
    getSignerForAccount: vi.fn(async () => mockSigner),
  } as unknown as SignerManager

  const userOp = {
    sender: ACCOUNT.address,
    nonce: '0x0',
    callData: '0x',
    callGasLimit: '0x186a0',
    verificationGasLimit: '0x186a0',
    preVerificationGas: '0x5208',
    maxFeePerGas: '0x59682f00',
    maxPriorityFeePerGas: '0x59682f00',
    signature: '0x',
  } as RpcUserOperation<'0.8'>

  function createService(
    delegationInfo: Partial<DelegationCheckResult> = {},
  ): ReturnType<typeof createBundledDelegationUserOpSignerService> {
    return createBundledDelegationUserOpSignerService({
      delegationInfo: { needsDelegation: false, ...delegationInfo } as DelegationCheckResult,
      getAccount: () => ACCOUNT,
      getProvider: async () => ({}) as Provider,
      getViemClient: async () => ({ getChainId: mockGetChainId }) as unknown as PublicClient,
      getSignerManager: () => mockSignerManager,
      getPaymasterClient: () => ({}) as PaymasterClient,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSigner.connect.mockReturnValue(mockSigner)
    mockSignTypedData.mockResolvedValue(`0x${'11'.repeat(65)}`)
  })

  it('signs with the caller-supplied chain in the EIP-712 domain when the client agrees', async () => {
    mockGetChainId.mockResolvedValue(UniverseChainId.Mainnet)

    const signed = await createService().signUserOp({ userOp, chainId: UniverseChainId.Mainnet })

    expect(mockSignTypedData).toHaveBeenCalledWith(
      expect.objectContaining({ domain: expect.objectContaining({ chainId: UniverseChainId.Mainnet }) }),
    )
    expect(signed.signature).not.toBe(userOp.signature)
  })

  it('refuses to sign when the client reports a different chain than the userOp was prepared for', async () => {
    mockGetChainId.mockResolvedValue(UniverseChainId.Base)

    await expect(createService().signUserOp({ userOp, chainId: UniverseChainId.Mainnet })).rejects.toThrow(
      `UserOp was prepared for chain ${UniverseChainId.Mainnet} but the signing client is on chain ${UniverseChainId.Base}`,
    )
    expect(mockSignTypedData).not.toHaveBeenCalled()
  })

  it('refuses to sign a delegation-needing userOp that carries no bundled 7702 authorization', async () => {
    mockGetChainId.mockResolvedValue(UniverseChainId.Mainnet)

    await expect(
      createService({ needsDelegation: true }).signUserOp({ userOp, chainId: UniverseChainId.Mainnet }),
    ).rejects.toThrow('requires an EIP-7702 delegation authorization')
  })
})
