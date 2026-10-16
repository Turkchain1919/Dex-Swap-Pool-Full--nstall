import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { PoolsOrderBy, PoolTokenLogicalOperator } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { getPairListPoolsParams } from '~/features/Liquidity/utils/getPairListPoolsParams'

const ADDRESS_A = '0x1111111111111111111111111111111111111111'
const ADDRESS_B = '0x2222222222222222222222222222222222222222'

describe('getPairListPoolsParams', () => {
  it('builds TVL-sorted pair params with checksummed tokens', () => {
    const params = getPairListPoolsParams({
      chainId: 1,
      addresses: [ADDRESS_A, ADDRESS_B],
      protocolVersions: [ProtocolVersion.V4],
    })

    expect(params).toEqual({
      chainIds: [1],
      sort: { orderBy: PoolsOrderBy.TVL },
      filter: {
        protocolVersions: [ProtocolVersion.V4],
        tokenFilter: { tokens: [ADDRESS_A, ADDRESS_B], logicalOperator: PoolTokenLogicalOperator.AND },
        includeSpam: true,
        applyTopLevelFilters: false,
      },
    })
  })

  it('omits chainIds when chainId is undefined', () => {
    const params = getPairListPoolsParams({
      chainId: undefined,
      addresses: [ADDRESS_A, ADDRESS_B],
      protocolVersions: [],
    })
    expect(params?.chainIds).toEqual([])
  })

  it('returns undefined when either address is missing (never an unfiltered chain-wide query)', () => {
    expect(
      getPairListPoolsParams({ chainId: 1, addresses: [ADDRESS_A, undefined], protocolVersions: [] }),
    ).toBeUndefined()
    expect(
      getPairListPoolsParams({ chainId: 1, addresses: [undefined, ADDRESS_B], protocolVersions: [] }),
    ).toBeUndefined()
  })
})
