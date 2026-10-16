import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Protocols } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { describe, expect, it } from 'vitest'
import { protocolsToProtocolVersion } from '~/data/pools/protocolVersion'

describe('protocolsToProtocolVersion', () => {
  it('maps the numeric Protocols enum to a ProtocolVersion', () => {
    expect(protocolsToProtocolVersion(Protocols.V2)).toBe(ProtocolVersion.V2)
    expect(protocolsToProtocolVersion(Protocols.V3)).toBe(ProtocolVersion.V3)
    expect(protocolsToProtocolVersion(Protocols.V4)).toBe(ProtocolVersion.V4)
  })

  // Regression: ListPools data is persisted to storage and rehydrated as plain JSON, where the
  // protobuf enum is its name ("V2"/"V3"/"V4") instead of the numeric value. These must still map
  // to a version, otherwise the pool table's Protocol column renders empty after a refresh.
  it('maps the proto JSON enum name (persisted form) to a ProtocolVersion', () => {
    expect(protocolsToProtocolVersion('V2' as unknown as Protocols)).toBe(ProtocolVersion.V2)
    expect(protocolsToProtocolVersion('V3' as unknown as Protocols)).toBe(ProtocolVersion.V3)
    expect(protocolsToProtocolVersion('V4' as unknown as Protocols)).toBe(ProtocolVersion.V4)
  })

  it('returns UNSPECIFIED for undefined or unknown values', () => {
    expect(protocolsToProtocolVersion(undefined)).toBe(ProtocolVersion.UNSPECIFIED)
    expect(protocolsToProtocolVersion('V5' as unknown as Protocols)).toBe(ProtocolVersion.UNSPECIFIED)
    expect(protocolsToProtocolVersion(999 as Protocols)).toBe(ProtocolVersion.UNSPECIFIED)
  })
})
