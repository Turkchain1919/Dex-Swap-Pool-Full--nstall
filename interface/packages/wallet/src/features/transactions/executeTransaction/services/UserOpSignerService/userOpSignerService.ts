import { UniverseChainId } from '@universe/chains'
import type { Address } from 'viem'
import type { RpcUserOperation } from 'viem/account-abstraction'

export type PaymasterFields = Pick<
  RpcUserOperation<'0.8'>,
  'paymaster' | 'paymasterData' | 'paymasterVerificationGasLimit' | 'paymasterPostOpGasLimit'
>

export interface UserOpSigner {
  // `chainId` is the chain the userOp was prepared for. A RpcUserOperation carries no chain of its
  // own, so the signer checks it against the client it signs through before building the domain.
  signUserOp(params: { userOp: RpcUserOperation<'0.8'>; chainId: UniverseChainId }): Promise<RpcUserOperation<'0.8'>>
  sendUserOp(signed: RpcUserOperation<'0.8'>): Promise<string>
  // For Uniswap-initiated userops only. Requests paymaster sponsorship through our paymaster.
  sponsorUniswapUserOp(params: {
    initialUserOp: RpcUserOperation<'0.8'>
    entryPoint: Address
    chainId: UniverseChainId
    paymasterServiceContext?: Record<string, unknown>
  }): Promise<RpcUserOperation<'0.8'>>
}
