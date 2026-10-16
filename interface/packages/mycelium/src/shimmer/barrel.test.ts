import { describe, expect, it } from 'vitest'
import * as barrel from '../index'
import { Shimmer as ShimmerWeb } from './Shimmer.web'

/**
 * Pins the root-barrel shimmer contract: `Shimmer` is canonical, and the
 * legacy aliases are exactly the shimmer-contract values the legacy ui
 * package's ROOT barrel exports (packages/ui — index re-exports the Shine and
 * Skeleton modules; ShineProps/SkeletonProps are NOT root-barrel exports
 * there), so a legacy root-barrel Shine/Skeleton import converts as a
 * mechanical barrel swap (INFRA-2957).
 *
 * This vitest config resolves `.web` first (mirroring production consumers),
 * so the barrel is pinned to the renderable web leg here; the same pin also
 * runs under the parity harness resolver in
 * packages/tailwind/src/parity/shimmer.
 */
describe('root barrel shimmer exports', () => {
  it('resolves to the renderable web leg under web-first resolution', () => {
    expect(barrel.Shimmer).toBe(ShimmerWeb)
  })

  it('aliases Shine and Skeleton to the same component as Shimmer (identity, not wrappers)', () => {
    expect(barrel.Shine).toBe(barrel.Shimmer)
    expect(barrel.Skeleton).toBe(barrel.Shimmer)
  })
})
