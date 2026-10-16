import type { DappRequestStoreItem } from 'src/app/features/dappRequests/shared'
import type { WithMetadata } from 'src/app/features/dappRequests/slice'
import { DappRequestType } from 'uniswap/src/features/dappRequests/types'

/**
 * Request types a wallet can serve without a private key.
 *
 * Deliberately an allowlist: anything not named here counts as needing a signature, so a request
 * type added later is refused while impersonating instead of silently rendering an approvable
 * review screen. Wrongly blocking a harmless request is visible and easy to fix; wrongly offering
 * to sign is neither.
 */
const REQUEST_TYPES_WITHOUT_SIGNATURE: ReadonlySet<DappRequestType> = new Set([
  DappRequestType.ChangeChain,
  DappRequestType.GetAccount,
  DappRequestType.GetCallsStatus,
  DappRequestType.GetCapabilities,
  DappRequestType.GetChainId,
  DappRequestType.GetPermissions,
  DappRequestType.ProviderDirect,
  DappRequestType.RequestAccount,
  DappRequestType.RequestPermissions,
  DappRequestType.RevokePermissions,
  DappRequestType.UniswapOpenSidebar,
])

/** Whether approving this request ends in a signature, and therefore needs a private key. */
export function requestRequiresSignature(request: WithMetadata<DappRequestStoreItem>): boolean {
  return !REQUEST_TYPES_WITHOUT_SIGNATURE.has(request.dappRequest.type)
}
