import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useShouldShowNowTradingCard } from '~/features/Toucan/Auction/hooks/useShouldShowNowTradingCard'
import {
  type AuctionDisplayState,
  AuctionDisplayPhase,
  AuctionDisplayResult,
  PoolAvailability,
} from '~/features/Toucan/Auction/utils/resolveAuctionDisplayState'

let mockDisplayState: AuctionDisplayState | undefined
let mockAuctionDetails: Record<string, unknown> | null
let mockIsTradingRestrictedUntilTge = false

vi.mock('~/features/Toucan/Auction/hooks/useAuctionDisplayState', () => ({
  useAuctionDisplayState: () => mockDisplayState,
}))
vi.mock('~/features/Toucan/Auction/store/useAuctionStore', () => ({
  useAuctionStore: (selector: (state: { auctionDetails: Record<string, unknown> | null }) => unknown) =>
    selector({ auctionDetails: mockAuctionDetails }),
}))
vi.mock('~/features/Toucan/Config/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/features/Toucan/Config/config')>()),
  isTradingRestrictedUntilTge: () => mockIsTradingRestrictedUntilTge,
}))

describe('useShouldShowNowTradingCard', () => {
  beforeEach(() => {
    mockDisplayState = {
      phase: AuctionDisplayPhase.Ended,
      result: AuctionDisplayResult.Successful,
      poolAvailability: PoolAvailability.HasPool,
      shouldShowSwap: true,
    }
    mockAuctionDetails = { chainId: 1, tokenAddress: '0x0000000000000000000000000000000000000001' }
    mockIsTradingRestrictedUntilTge = false
  })

  it('shows once a successful auction has ended with a pool', () => {
    expect(renderHook(() => useShouldShowNowTradingCard()).result.current).toBe(true)
  })

  it('hides without auction details', () => {
    mockAuctionDetails = null
    expect(renderHook(() => useShouldShowNowTradingCard()).result.current).toBe(false)
  })

  it('hides while trading is restricted until the TGE', () => {
    mockIsTradingRestrictedUntilTge = true
    expect(renderHook(() => useShouldShowNowTradingCard()).result.current).toBe(false)
  })

  it('hides while provenance is off', () => {
    mockDisplayState = undefined
    expect(renderHook(() => useShouldShowNowTradingCard()).result.current).toBe(false)
  })
})
