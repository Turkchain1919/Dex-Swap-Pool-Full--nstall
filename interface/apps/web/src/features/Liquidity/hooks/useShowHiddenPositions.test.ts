import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useShowHiddenPositions } from '~/features/Liquidity/hooks/useShowHiddenPositions'

const ADDRESS_A = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
const ADDRESS_B = '0x2222222222222222222222222222222222222222'
const ADDRESS_A_UPPERCASED = `0x${ADDRESS_A.slice(2).toUpperCase()}`

function renderForAddress(initialAddress: string | undefined) {
  return renderHook(({ address }: { address: string | undefined }) => useShowHiddenPositions(address), {
    initialProps: { address: initialAddress },
  })
}

describe('useShowHiddenPositions', () => {
  // The store is a module-level singleton, so each test leaves it off before finishing asserts
  // via the account-switch fallback (a fresh address always reads off) rather than a reset hook.
  it('defaults to off', () => {
    const { result } = renderForAddress(ADDRESS_A)

    expect(result.current.showHiddenPositions).toBe(false)
  })

  it('shares the toggle between two consumers of the same wallet', () => {
    const pageA = renderForAddress(ADDRESS_A)
    const pageB = renderForAddress(ADDRESS_A)

    act(() => pageA.result.current.setShowHiddenPositions(true))

    expect(pageA.result.current.showHiddenPositions).toBe(true)
    expect(pageB.result.current.showHiddenPositions).toBe(true)

    act(() => pageB.result.current.setShowHiddenPositions(false))

    expect(pageA.result.current.showHiddenPositions).toBe(false)
  })

  it('matches differently-cased forms of the same address', () => {
    const lowercased = renderForAddress(ADDRESS_A)
    const uppercased = renderForAddress(ADDRESS_A_UPPERCASED)

    act(() => uppercased.result.current.setShowHiddenPositions(true))

    expect(lowercased.result.current.showHiddenPositions).toBe(true)

    act(() => lowercased.result.current.setShowHiddenPositions(false))
  })

  it('falls back to off when the wallet changes', () => {
    const { result, rerender } = renderForAddress(ADDRESS_A)

    act(() => result.current.setShowHiddenPositions(true))
    expect(result.current.showHiddenPositions).toBe(true)

    rerender({ address: ADDRESS_B })

    expect(result.current.showHiddenPositions).toBe(false)
  })

  it('never reads on without a wallet, even after setting', () => {
    const { result } = renderForAddress(undefined)

    act(() => result.current.setShowHiddenPositions(true))

    expect(result.current.showHiddenPositions).toBe(false)
  })
})
