import { PositionStatus } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import {
  PositionStatus as LiquidityPositionStatus,
  RangeStatus,
} from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { describe, expect, it } from 'vitest'
import { v2StatusFilterToRequestStatuses } from '~/features/Liquidity/constants'

const NO_RANGE: PositionStatus[] = []
const IN_RANGE: PositionStatus[] = [PositionStatus.IN_RANGE]
const OUT_OF_RANGE: PositionStatus[] = [PositionStatus.OUT_OF_RANGE]

describe('v2StatusFilterToRequestStatuses', () => {
  it('maps open/closed to lifecycle statuses', () => {
    expect(v2StatusFilterToRequestStatuses(['open'], NO_RANGE).statuses).toEqual([LiquidityPositionStatus.OPEN])
    expect(v2StatusFilterToRequestStatuses(['closed'], NO_RANGE).statuses).toEqual([LiquidityPositionStatus.CLOSED])
    expect(v2StatusFilterToRequestStatuses(['open', 'closed'], NO_RANGE).statuses).toEqual([
      LiquidityPositionStatus.OPEN,
      LiquidityPositionStatus.CLOSED,
    ])
  })

  it('never emits an empty lifecycle set (empty falls back to OPEN+CLOSED)', () => {
    expect(v2StatusFilterToRequestStatuses([], NO_RANGE).statuses).toEqual([
      LiquidityPositionStatus.OPEN,
      LiquidityPositionStatus.CLOSED,
    ])
  })

  it('applies a single range chip to an open-only selection', () => {
    expect(v2StatusFilterToRequestStatuses(['open'], IN_RANGE).rangeStatuses).toEqual([RangeStatus.IN_RANGE])
    expect(v2StatusFilterToRequestStatuses(['open'], OUT_OF_RANGE).rangeStatuses).toEqual([RangeStatus.OUT_OF_RANGE])
  })

  it('keeps range refinement when closed is also selected (chip stays effective)', () => {
    const { statuses, rangeStatuses } = v2StatusFilterToRequestStatuses(['open', 'closed'], IN_RANGE)
    expect(statuses).toEqual([LiquidityPositionStatus.OPEN, LiquidityPositionStatus.CLOSED])
    expect(rangeStatuses).toEqual([RangeStatus.IN_RANGE])
  })

  it('keeps range refinement on a closed-only selection (BE intersection yields an empty result)', () => {
    const { statuses, rangeStatuses } = v2StatusFilterToRequestStatuses(['closed'], IN_RANGE)
    expect(statuses).toEqual([LiquidityPositionStatus.CLOSED])
    expect(rangeStatuses).toEqual([RangeStatus.IN_RANGE])
  })

  it('emits no range refinement when both or neither chips are selected', () => {
    expect(v2StatusFilterToRequestStatuses(['open'], NO_RANGE).rangeStatuses).toEqual([])
    expect(
      v2StatusFilterToRequestStatuses(['open'], [PositionStatus.IN_RANGE, PositionStatus.OUT_OF_RANGE]).rangeStatuses,
    ).toEqual([])
  })
})
