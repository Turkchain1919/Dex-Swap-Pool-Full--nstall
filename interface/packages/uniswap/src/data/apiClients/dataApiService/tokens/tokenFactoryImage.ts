import { createPromiseClient } from '@connectrpc/connect'
import { TokenFactoryService } from '@uniswap/client-launches/dist/launches/v1/token_factory_connect'
import type { VerifyTokenFactoryImageResponse } from '@uniswap/client-launches/dist/launches/v1/token_factory_pb'
import { entryGatewayPostTransport } from 'uniswap/src/data/transport'

// Promise client (not a react-query hook): the token image flow is an imperative
// presign -> upload -> verify sequence driven from a mutation, not a render-time query.
const client = createPromiseClient(TokenFactoryService, entryGatewayPostTransport)

/**
 * Mints a Pinata v3 signed upload URL for a token-factory image. The URL is short-lived and already
 * scopes the upload to the token-launcher group + network server-side.
 */
export async function createTokenFactoryPresignedUrl(fileName: string): Promise<string> {
  const { url } = await client.createTokenFactoryPresignedUrl({ fileName })
  return url
}

/**
 * Runs server-side moderation (Rekognition) on an already-uploaded CID. Resolves with the verdict;
 * the caller distinguishes APPROVED/BLOCKED via `status` and handles the transient "scan unavailable"
 * error (a `ConnectError`) with a retry.
 */
export function verifyTokenFactoryImage(cid: string): Promise<VerifyTokenFactoryImageResponse> {
  return client.verifyTokenFactoryImage({ cid })
}
