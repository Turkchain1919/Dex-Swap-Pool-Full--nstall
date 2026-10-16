import {
  ProtectionResult as RestProtectionResult,
  SafetyLevel as RestSafetyLevel,
} from '@uniswap/client-data-api/dist/data/v1/types_pb'
import { GraphQLApi, TradingApi } from '@universe/api'
import {
  fromGraphQLProtectionResult,
  fromGraphQLSafetyLevel,
  fromRestProtectionResult,
  fromRestSafetyLevel,
  fromTradingApiSafetyLevel,
  fromV2Verdict,
  ProtectionResult,
  SafetyLevel,
} from 'uniswap/src/features/dataApi/safety'
import { logger } from 'utilities/src/logger/logger'

describe('domain safety enum values match the GraphQL wire values', () => {
  it.each(Object.values(SafetyLevel))('SafetyLevel %s exists on the GraphQL enum', (value) => {
    expect(Object.values(GraphQLApi.SafetyLevel)).toContain(value)
  })

  it.each(Object.values(ProtectionResult))('ProtectionResult %s exists on the GraphQL enum', (value) => {
    expect(Object.values(GraphQLApi.ProtectionResult)).toContain(value)
  })
})

describe('fromGraphQLSafetyLevel', () => {
  it.each([
    [GraphQLApi.SafetyLevel.Blocked, SafetyLevel.Blocked],
    [GraphQLApi.SafetyLevel.MediumWarning, SafetyLevel.MediumWarning],
    [GraphQLApi.SafetyLevel.StrongWarning, SafetyLevel.StrongWarning],
    [GraphQLApi.SafetyLevel.Verified, SafetyLevel.Verified],
  ])('maps %s to %s', (input, expected) => {
    expect(fromGraphQLSafetyLevel(input)).toBe(expected)
  })

  it('maps undefined to undefined', () => {
    expect(fromGraphQLSafetyLevel(undefined)).toBeUndefined()
  })
})

describe('fromGraphQLProtectionResult', () => {
  it.each([
    [GraphQLApi.ProtectionResult.Benign, ProtectionResult.Benign],
    [GraphQLApi.ProtectionResult.Malicious, ProtectionResult.Malicious],
    [GraphQLApi.ProtectionResult.Spam, ProtectionResult.Spam],
    [GraphQLApi.ProtectionResult.Warning, ProtectionResult.Warning],
    [GraphQLApi.ProtectionResult.Unknown, ProtectionResult.Unknown],
    [undefined, ProtectionResult.Unknown],
  ])('maps %s to %s', (input, expected) => {
    expect(fromGraphQLProtectionResult(input)).toBe(expected)
  })
})

describe('fromRestSafetyLevel', () => {
  it.each([
    [RestSafetyLevel.BLOCKED, SafetyLevel.Blocked],
    [RestSafetyLevel.MEDIUM_WARNING, SafetyLevel.MediumWarning],
    [RestSafetyLevel.STRONG_WARNING, SafetyLevel.StrongWarning],
    [RestSafetyLevel.VERIFIED, SafetyLevel.Verified],
  ])('maps %s to %s', (input, expected) => {
    expect(fromRestSafetyLevel(input)).toBe(expected)
  })

  it('maps UNKNOWN and undefined to undefined', () => {
    expect(fromRestSafetyLevel(RestSafetyLevel.UNKNOWN)).toBeUndefined()
    expect(fromRestSafetyLevel(undefined)).toBeUndefined()
  })
})

describe('fromRestProtectionResult', () => {
  it.each([
    [RestProtectionResult.BENIGN, ProtectionResult.Benign],
    [RestProtectionResult.MALICIOUS, ProtectionResult.Malicious],
    [RestProtectionResult.SPAM, ProtectionResult.Spam],
    [RestProtectionResult.WARNING, ProtectionResult.Warning],
    [RestProtectionResult.UNKNOWN, ProtectionResult.Unknown],
    [undefined, ProtectionResult.Unknown],
  ])('maps %s to %s', (input, expected) => {
    expect(fromRestProtectionResult(input)).toBe(expected)
  })
})

describe('fromTradingApiSafetyLevel', () => {
  it.each([
    [TradingApi.SafetyLevel.BLOCKED, SafetyLevel.Blocked],
    [TradingApi.SafetyLevel.MEDIUM_WARNING, SafetyLevel.MediumWarning],
    [TradingApi.SafetyLevel.STRONG_WARNING, SafetyLevel.StrongWarning],
    [TradingApi.SafetyLevel.VERIFIED, SafetyLevel.Verified],
  ])('maps %s to %s', (input, expected) => {
    expect(fromTradingApiSafetyLevel(input)).toBe(expected)
  })

  it('maps undefined to undefined', () => {
    expect(fromTradingApiSafetyLevel(undefined)).toBeUndefined()
  })
})

describe('fromV2Verdict', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
  })

  it.each([
    ['Benign', ProtectionResult.Benign],
    ['Malicious', ProtectionResult.Malicious],
    ['Spam', ProtectionResult.Spam],
    ['Warning', ProtectionResult.Warning],
    ['SomethingNew', ProtectionResult.Unknown],
    [undefined, ProtectionResult.Unknown],
  ])('maps %s to %s', (input, expected) => {
    expect(fromV2Verdict(input)).toBe(expected)
  })

  it('warns on a non-empty unrecognized verdict but not on undefined', () => {
    fromV2Verdict('SomethingNew')
    expect(logger.warn).toHaveBeenCalledTimes(1)
    fromV2Verdict(undefined)
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })
})
