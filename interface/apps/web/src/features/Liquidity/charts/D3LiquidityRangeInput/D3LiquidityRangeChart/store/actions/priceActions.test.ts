import {
  createParent,
  createRenderingContext,
  createStore,
  TICK_SPACING,
} from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/test-utils/chartStoreHarness'
import { DefaultPriceStrategy } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/types'
import {
  calculateStrategyTicks,
  detectTickStrategy,
} from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/utils/priceStrategies'

describe('setPriceStrategy without a mounted chart', () => {
  it('moves the whole range past the previous one without the parent clamping it', () => {
    // ONE_SIDED_LOWER sits entirely below the current tick; ONE_SIDED_UPPER entirely above.
    // Switching between them moves min above the previous max.
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 0, parent })

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.ONE_SIDED_LOWER,
      animate: false,
    })
    const lower = { ...parent.state }
    expect(lower.maxTick).toBeLessThanOrEqual(0)

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.ONE_SIDED_UPPER,
      animate: false,
    })

    // The parent must end up with exactly the strategy's own ticks.
    expect(parent.state.minTick).toBe(store.getState().minTick)
    expect(parent.state.maxTick).toBe(store.getState().maxTick)
    expect(parent.state.minTick).toBeGreaterThanOrEqual(0)
  })
})

describe('syncCurrentTickFromParent', () => {
  it('re-anchors a selected preset to a higher current tick without the parent clamping min', () => {
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 0, currentPrice: 1, parent })

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.STABLE,
      animate: false,
    })
    expect(parent.state.minTick).toBe(-3 * TICK_SPACING)
    expect(parent.state.maxTick).toBe(3 * TICK_SPACING)

    // Raising the typed initial price moves the current tick far above the held range.
    store.getState().actions.syncCurrentTickFromParent({
      currentTick: 1000,
      currentPrice: 1.105,
      tickSpacing: TICK_SPACING,
      isInitialPriceDirty: true,
    })

    expect(store.getState().selectedPriceStrategy).toBe(DefaultPriceStrategy.STABLE)
    // Parent and store must agree, and both must hold the re-anchored range.
    expect(parent.state.minTick).toBe(store.getState().minTick)
    expect(parent.state.maxTick).toBe(store.getState().maxTick)
    expect(parent.state.minTick).toBeGreaterThan(3 * TICK_SPACING)
  })

  it('re-anchors down to a lower current tick without the parent clamping max', () => {
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 1000, currentPrice: 1.105, parent })

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.STABLE,
      animate: false,
    })
    store.getState().actions.syncCurrentTickFromParent({
      currentTick: 0,
      currentPrice: 1,
      tickSpacing: TICK_SPACING,
      isInitialPriceDirty: true,
    })

    expect(parent.state.minTick).toBe(store.getState().minTick)
    expect(parent.state.maxTick).toBe(store.getState().maxTick)
    expect(parent.state.maxTick).toBeLessThan(960)
  })

  it('does not re-anchor a selected preset on an existing pool when the live price moves', () => {
    // An established pool (creatingPoolOrPair: false) whose current tick moves because the poolInfo
    // query polls. The user's chosen range must never be moved by the poll — including a typed range
    // left under a still-lit preset chip, which a re-anchor would clobber before the user signs. The
    // store still tracks the fresh tick for the price line.
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 0, currentPrice: 1, creatingPoolOrPair: false, parent })

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.ONE_SIDED_UPPER,
      animate: false,
    })
    const rangeBefore = { ...parent.state }

    // A jump that clears the whole range — under the create flow this would re-anchor.
    store
      .getState()
      .actions.syncCurrentTickFromParent({ currentTick: 9000, currentPrice: 3, tickSpacing: TICK_SPACING })

    expect(store.getState().selectedPriceStrategy).toBe(DefaultPriceStrategy.ONE_SIDED_UPPER)
    expect(store.getState().currentTick).toBe(9000) // tracked for the price line
    expect(parent.state).toEqual(rangeBefore) // but the range held
  })

  it('re-anchors a preset on a streamed re-seed that jumps clear across it in a single move', () => {
    // Create flow, field untouched (isInitialPriceDirty false): the streamed reference re-seeds and
    // the tick jumps from below the range to above it in one step. Both endpoints read "out of range",
    // so a boolean in/out check would miss the crossover and strand the range on the wrong side; the
    // three-state position check catches it and re-anchors.
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 0, currentPrice: 1, parent }) // create flow (default)

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.ONE_SIDED_UPPER,
      animate: false,
    })
    // [60, 6960] at currentTick 0 — the price (tick 0) is below the range.
    expect(parent.state.minTick).toBe(TICK_SPACING)

    // Tick 9000 is above the whole range, not just past a single edge.
    store.getState().actions.syncCurrentTickFromParent({
      currentTick: 9000,
      currentPrice: 3,
      tickSpacing: TICK_SPACING,
      isInitialPriceDirty: false,
    })

    expect(store.getState().selectedPriceStrategy).toBe(DefaultPriceStrategy.ONE_SIDED_UPPER)
    expect(parent.state.minTick).toBe(store.getState().minTick)
    // Re-anchored to sit one spacing above the new current tick, not stranded at the old 60.
    expect(parent.state.minTick).toBe(9000 + TICK_SPACING)
  })

  it('re-anchors a preset in the create flow when the user edits the price within the range', () => {
    // Create flow: the current tick moves because the user retyped the initial price
    // (isInitialPriceDirty). A selected preset must recenter on the new price even when it hasn't
    // crossed the range boundary — otherwise the pool initializes with a range centered on the old
    // price (near single-sided at its edge).
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 0, currentPrice: 1, parent }) // creatingPoolOrPair defaults true

    store.getState().actions.setPriceStrategy({ priceStrategy: DefaultPriceStrategy.WIDE, animate: false })
    const rangeBefore = { ...parent.state }

    // Retype the price to a tick still well inside the WIDE range — no boundary crossing.
    store.getState().actions.syncCurrentTickFromParent({
      currentTick: 600,
      currentPrice: 1.06,
      tickSpacing: TICK_SPACING,
      isInitialPriceDirty: true,
    })

    const expected = calculateStrategyTicks({
      priceStrategy: DefaultPriceStrategy.WIDE,
      currentTick: 600,
      tickSpacing: TICK_SPACING,
    })
    expect(store.getState().selectedPriceStrategy).toBe(DefaultPriceStrategy.WIDE)
    expect(parent.state.minTick).toBe(store.getState().minTick)
    expect(parent.state).toEqual(expected)
    expect(parent.state).not.toEqual(rangeBefore)
  })

  it('does not re-anchor a create-flow preset when the streamed price re-seeds within the range', () => {
    // Create flow, but the field is untouched (isInitialPriceDirty false), so the tick moved because
    // the streamed reference re-seeded on its own — not a user edit. A preset must hold still while
    // the re-seed drifts within it; re-anchoring here would make the range twitch every few seconds
    // (LP-1673). It still re-anchors on a boundary crossing, same as an existing pool.
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 0, currentPrice: 1, parent })

    store.getState().actions.setPriceStrategy({ priceStrategy: DefaultPriceStrategy.WIDE, animate: false })
    const rangeBefore = { ...parent.state }

    store.getState().actions.syncCurrentTickFromParent({
      currentTick: 600,
      currentPrice: 1.06,
      tickSpacing: TICK_SPACING,
      isInitialPriceDirty: false,
    })

    expect(store.getState().selectedPriceStrategy).toBe(DefaultPriceStrategy.WIDE)
    expect(store.getState().currentTick).toBe(600) // tracked, but the range held
    expect(parent.state).toEqual(rangeBefore)
  })

  it('does not clobber a typed range on a create-flow re-seed after a preset was selected', () => {
    // Create flow: pick STABLE, then type a custom range. The min/max input routes the commit through
    // handleTickRangeChange, which re-detects the label and clears the now-stale preset — so a later
    // streamed re-seed that crosses a typed bound must NOT re-anchor STABLE over the user's range.
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 0, currentPrice: 1, parent })

    store.getState().actions.setPriceStrategy({ priceStrategy: DefaultPriceStrategy.STABLE, animate: false })
    // A typed custom range that matches no preset at the current tick (as D3LiquidityMinMaxInput does).
    store.getState().actions.handleTickRangeChange({ minTick: -10 * TICK_SPACING, maxTick: 2 * TICK_SPACING })
    expect(store.getState().selectedPriceStrategy).toBeUndefined()
    const rangeBefore = { ...parent.state }

    // Streamed re-seed (field untouched) crossing the typed bound — the range must hold.
    store.getState().actions.syncCurrentTickFromParent({
      currentTick: 600,
      currentPrice: 1.06,
      tickSpacing: TICK_SPACING,
      isInitialPriceDirty: false,
    })

    expect(parent.state).toEqual(rangeBefore)
  })

  it('does not adopt a manually entered range as a preset on an existing pool when the live price drifts', () => {
    // The manual range happens to match STABLE's shape at the current tick. An existing pool bails
    // before the detect branch, so a polled tick move must never relabel it as STABLE — which would
    // otherwise light the chip and let a later move re-anchor over the user's bounds.
    const STABLE_SHAPED = { minTick: -3 * TICK_SPACING, maxTick: 3 * TICK_SPACING }
    const parent = createParent(STABLE_SHAPED)
    const store = createStore({ currentTick: 0, currentPrice: 1, creatingPoolOrPair: false, ...STABLE_SHAPED, parent })

    // Tick 30 floors to the same bucket as 0, so [-180, 180] still matches STABLE within tolerance.
    store
      .getState()
      .actions.syncCurrentTickFromParent({ currentTick: 30, currentPrice: 1.003, tickSpacing: TICK_SPACING })

    expect(store.getState().selectedPriceStrategy).toBeUndefined()
    expect(parent.state).toEqual(STABLE_SHAPED)
  })

  it('leaves a manually entered range untouched on an existing pool when the price moves', () => {
    // A custom range (no preset) must not move under the user as the live price ticks.
    const CUSTOM = { minTick: -5 * TICK_SPACING, maxTick: 2 * TICK_SPACING }
    const parent = createParent(CUSTOM)
    const store = createStore({ currentTick: 0, currentPrice: 1, creatingPoolOrPair: false, ...CUSTOM, parent })

    store
      .getState()
      .actions.syncCurrentTickFromParent({ currentTick: 600, currentPrice: 1.06, tickSpacing: TICK_SPACING })

    expect(parent.state.minTick).toBe(CUSTOM.minTick)
    expect(parent.state.maxTick).toBe(CUSTOM.maxTick)
  })

  it('treats an unset initial price (NaN) as unchanged rather than re-running every effect', () => {
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 0, currentPrice: NaN, parent })

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.STABLE,
      animate: false,
    })
    const minAfterStrategy = parent.state.minTick
    const maxAfterStrategy = parent.state.maxTick

    // The parent re-passes Number(price?.toSignificant()) === NaN on every render.
    store.getState().actions.syncCurrentTickFromParent({ currentTick: 0, currentPrice: NaN, tickSpacing: TICK_SPACING })

    expect(parent.state.minTick).toBe(minAfterStrategy)
    expect(parent.state.maxTick).toBe(maxAfterStrategy)
  })
})

describe('tick spacing changing under the create flow', () => {
  it('re-anchors a selected preset to the new spacing when the fee tier changes', () => {
    // While creating there is no pool id, so the remount key is constant and a fee-tier change
    // arrives as a new tickSpacing prop on the SAME store.
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 0, currentPrice: 1, parent })

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.STABLE,
      animate: false,
    })
    expect(parent.state.minTick).toBe(-3 * TICK_SPACING)

    const NEW_SPACING = 10
    store.getState().actions.syncCurrentTickFromParent({
      currentTick: 0,
      currentPrice: 1,
      tickSpacing: NEW_SPACING,
    })

    expect(store.getState().tickSpacing).toBe(NEW_SPACING)
    // Ticks must be usable at the new spacing, not snapped to the old one.
    expect(Math.abs(parent.state.minTick! % NEW_SPACING)).toBe(0)
    expect(Math.abs(parent.state.maxTick! % NEW_SPACING)).toBe(0)
    expect(parent.state.minTick).toBe(-3 * NEW_SPACING)
    expect(parent.state.maxTick).toBe(3 * NEW_SPACING)
  })
})

describe('full range held alongside a previously selected preset', () => {
  it('does not write concrete ticks under full range when the initial price changes', () => {
    // The create flow's `reset` returns early with no rendering context, so toggling the separate
    // Full range control leaves the earlier strategy selected in the store.
    const parent = createParent({ minTick: undefined, maxTick: undefined })
    const store = createStore({ currentTick: 0, currentPrice: 1, parent })

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.STABLE,
      animate: false,
    })
    store.getState().actions.syncIsFullRangeFromParent(true)
    const ticksBefore = { ...parent.state }

    store.getState().actions.syncCurrentTickFromParent({
      currentTick: 1000,
      currentPrice: 1.105,
      tickSpacing: TICK_SPACING,
    })

    expect(store.getState().isFullRange).toBe(true)
    expect(parent.state).toEqual(ticksBefore)
  })
})

describe('setPriceStrategy with a mounted chart', () => {
  // ONE_SIDED_LOWER sits entirely below the current tick, ONE_SIDED_UPPER entirely above, so
  // switching between them lifts min above the previously-held max. At currentTick 0 / spacing 60
  // that is [-6960, -60] -> [60, 6960].
  const LOWER = { minTick: -6960, maxTick: -TICK_SPACING }
  const UPPER = { minTick: TICK_SPACING, maxTick: 6960 }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('moves the whole range past the previous one without the parent clamping it', () => {
    // Same range-clearing move as the chart-free case, but on an established pool: the chart is
    // mounted, so the ticks reach the parent from the post-animation timeout instead.
    const parent = createParent(LOWER)
    const store = createStore({ currentTick: 0, ...LOWER, parent })
    store.setState({ renderingContext: createRenderingContext({ currentTick: 0 }) })

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.ONE_SIDED_UPPER,
      animate: true,
    })
    vi.runAllTimers()

    expect(store.getState()).toMatchObject(UPPER)
    // Emitted edge-by-edge, min arrived as the old max minus one spacing (-120) instead of 60.
    expect(parent.state).toEqual(UPPER)
  })

  it('keeps the strategy the parent holds in sync with the highlighted card', () => {
    const parent = createParent(LOWER)
    const store = createStore({ currentTick: 0, ...LOWER, parent })
    store.setState({ renderingContext: createRenderingContext({ currentTick: 0 }) })

    store.getState().actions.setPriceStrategy({
      priceStrategy: DefaultPriceStrategy.ONE_SIDED_UPPER,
      animate: true,
    })
    vi.runAllTimers()

    // Nothing re-detects the strategy from the ticks the parent sends back down, so a clamped
    // min leaves the card lit on a range the position will not actually use.
    expect(store.getState().selectedPriceStrategy).toBe(DefaultPriceStrategy.ONE_SIDED_UPPER)
    expect(detectTickStrategy({ ...parent.state, currentTick: 0, tickSpacing: TICK_SPACING })).toBe(
      DefaultPriceStrategy.ONE_SIDED_UPPER,
    )
  })
})

describe('handleTickRangeChange', () => {
  it('keeps the bounds ordered, which the parent no longer does for an atomic update', () => {
    const parent = createParent({ minTick: -3 * TICK_SPACING, maxTick: -TICK_SPACING })
    const store = createStore({ currentTick: 0, minTick: -3 * TICK_SPACING, maxTick: -TICK_SPACING, parent })

    store.getState().actions.handleTickRangeChange({ minTick: 0, maxTick: 0 })

    expect(store.getState().maxTick).toBe(TICK_SPACING)
    expect(parent.state).toEqual({ minTick: 0, maxTick: TICK_SPACING })
  })
})
