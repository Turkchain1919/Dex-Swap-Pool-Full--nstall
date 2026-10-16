import { describe, expect, it } from 'vitest'
import { PoolSortFields } from '~/data/pools/poolStats'
import { createPoolTableStore } from '~/pages/Explore/tables/Pools/poolTableStore'

describe('poolTableStore', () => {
  it('starts with 1 day volume and sortAscending false', () => {
    const store = createPoolTableStore()
    const state = store.getState()

    expect(state.sortMethod).toBe(PoolSortFields.Volume24h)
    expect(state.sortAscending).toBe(false)
  })

  it('setSort with a new category sets sortMethod and resets sortAscending to false', () => {
    const store = createPoolTableStore()

    store.getState().actions.setSort(PoolSortFields.Apr)

    expect(store.getState().sortMethod).toBe(PoolSortFields.Apr)
    expect(store.getState().sortAscending).toBe(false)
  })

  it('setSort with the same category toggles sortAscending', () => {
    const store = createPoolTableStore()

    store.getState().actions.setSort(PoolSortFields.Volume24h)
    expect(store.getState().sortAscending).toBe(true)

    store.getState().actions.setSort(PoolSortFields.Volume24h)
    expect(store.getState().sortAscending).toBe(false)
  })

  it('resetSort restores initial sortMethod and sortAscending', () => {
    const store = createPoolTableStore()

    store.getState().actions.setSort(PoolSortFields.Apr)
    store.getState().actions.setSort(PoolSortFields.Apr)
    expect(store.getState().sortMethod).toBe(PoolSortFields.Apr)
    expect(store.getState().sortAscending).toBe(true)

    store.getState().actions.resetSort()

    expect(store.getState().sortMethod).toBe(PoolSortFields.Volume24h)
    expect(store.getState().sortAscending).toBe(false)
  })
})
