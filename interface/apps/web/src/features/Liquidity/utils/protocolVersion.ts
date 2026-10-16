import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'

export function getProtocolVersionFromLabel(label: string | null | undefined): ProtocolVersion | undefined {
  switch (label) {
    case 'v2':
      return ProtocolVersion.V2
    case 'v3':
      return ProtocolVersion.V3
    case 'v4':
      return ProtocolVersion.V4
    default:
      return undefined
  }
}

/** Normalizes a wire `ProtocolVersion` that may have rehydrated from disk as its enum key string (e.g. "V4") back to the numeric enum. */
export function toProtocolVersion(version: ProtocolVersion | string): ProtocolVersion {
  if (typeof version !== 'string') {
    return version
  }
  // Explicit switch (not a bracket-indexed reverse lookup): a numeric enum's reverse mapping
  // means `ProtocolVersion['1']` returns the string "V2", so indexing on an unvalidated string
  // can silently return a mistyped value instead of UNSPECIFIED.
  switch (version) {
    case 'V2':
      return ProtocolVersion.V2
    case 'V3':
      return ProtocolVersion.V3
    case 'V4':
      return ProtocolVersion.V4
    default:
      return ProtocolVersion.UNSPECIFIED
  }
}

/**
 * The protocol mappers live in `packages/uniswap` beside the parsers that need them, and are
 * re-exported here under the names this app's call sites already use.
 */
export {
  getProtocolVersionLabel,
  protocolVersionToLiquidityServiceProtocols as getProtocols,
} from 'uniswap/src/features/positions/utils'

export function poolEnabledProtocolVersion(
  protocolVersion: ProtocolVersion,
): protocolVersion is ProtocolVersion.V3 | ProtocolVersion.V4 {
  return protocolVersion === ProtocolVersion.V3 || protocolVersion === ProtocolVersion.V4
}
