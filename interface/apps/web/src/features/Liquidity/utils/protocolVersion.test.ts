import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { describe, expect, it } from 'vitest'
import {
  getProtocolVersionFromLabel,
  getProtocolVersionLabel,
  toProtocolVersion,
} from '~/features/Liquidity/utils/protocolVersion'

describe('getProtocolVersionLabel', () => {
  it('returns correct label for V2', () => {
    expect(getProtocolVersionLabel(ProtocolVersion.V2)).toBe('v2')
  })
  it('returns correct label for V3', () => {
    expect(getProtocolVersionLabel(ProtocolVersion.V3)).toBe('v3')
  })
  it('returns correct label for V4', () => {
    expect(getProtocolVersionLabel(ProtocolVersion.V4)).toBe('v4')
  })
  it('returns undefined for unknown version', () => {
    expect(getProtocolVersionLabel(999 as ProtocolVersion)).toBeUndefined()
  })
})

describe('toProtocolVersion', () => {
  it('passes through an already-numeric ProtocolVersion', () => {
    expect(toProtocolVersion(ProtocolVersion.V2)).toBe(ProtocolVersion.V2)
    expect(toProtocolVersion(ProtocolVersion.V4)).toBe(ProtocolVersion.V4)
  })

  // Regression: pools data persisted to storage rehydrates as plain JSON, where a protobuf enum
  // is its name ("V4") instead of the numeric value.
  it('normalizes the proto JSON enum name (persisted form) to the numeric enum', () => {
    expect(toProtocolVersion('V2')).toBe(ProtocolVersion.V2)
    expect(toProtocolVersion('V3')).toBe(ProtocolVersion.V3)
    expect(toProtocolVersion('V4')).toBe(ProtocolVersion.V4)
  })

  it('falls back to UNSPECIFIED for a string that is not a valid enum key', () => {
    expect(toProtocolVersion('NOT_A_VERSION')).toBe(ProtocolVersion.UNSPECIFIED)
  })
})

describe('getProtocolVersionFromLabel', () => {
  it('returns correct version for v2', () => {
    expect(getProtocolVersionFromLabel('v2')).toBe(ProtocolVersion.V2)
  })
  it('returns correct version for v3', () => {
    expect(getProtocolVersionFromLabel('v3')).toBe(ProtocolVersion.V3)
  })
  it('returns correct version for v4', () => {
    expect(getProtocolVersionFromLabel('v4')).toBe(ProtocolVersion.V4)
  })
  it('returns undefined for unknown, null, or undefined labels', () => {
    expect(getProtocolVersionFromLabel('v5')).toBeUndefined()
    expect(getProtocolVersionFromLabel(null)).toBeUndefined()
    expect(getProtocolVersionFromLabel(undefined)).toBeUndefined()
  })
})
