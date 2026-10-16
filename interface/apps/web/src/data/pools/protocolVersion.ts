import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Protocols } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'

export function protocolsToProtocolVersion(version: Protocols | string | undefined): ProtocolVersion {
  // Persisted ListPools data rehydrates protobuf enums as their name ("V2"/"V3"/"V4"); normalize to the numeric enum.
  const normalized = typeof version === 'string' ? Protocols[version as keyof typeof Protocols] : version
  switch (normalized) {
    case Protocols.V2:
      return ProtocolVersion.V2
    case Protocols.V3:
      return ProtocolVersion.V3
    case Protocols.V4:
      return ProtocolVersion.V4
    default:
      return ProtocolVersion.UNSPECIFIED
  }
}
