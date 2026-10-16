import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCeilingRecap } from '~/features/Toucan/Auction/hooks/useCeilingRecap'

const CEILING = 1000n

function setup(initial: { maxValidBidQ96?: bigint; tokenValueQ96?: bigint }) {
  const onRecap = vi.fn()
  const view = renderHook(
    (props: { maxValidBidQ96?: bigint; tokenValueQ96?: bigint }) =>
      useCeilingRecap({
        maxValidBidQ96: props.maxValidBidQ96,
        tokenValueQ96: props.tokenValueQ96,
        tokenValue: '1.5',
        onRecap,
      }),
    { initialProps: initial },
  )
  return { ...view, onRecap }
}

describe('useCeilingRecap', () => {
  it('re-caps a value that was entered before the ceiling resolved', () => {
    // The window this exists for: typed while VerifyWallet was still in flight.
    const { rerender, onRecap } = setup({ maxValidBidQ96: undefined, tokenValueQ96: 5000n })
    expect(onRecap).not.toHaveBeenCalled()

    rerender({ maxValidBidQ96: CEILING, tokenValueQ96: 5000n })

    expect(onRecap).toHaveBeenCalledExactlyOnceWith('1.5')
  })

  it('leaves a value that is already legal alone', () => {
    const { rerender, onRecap } = setup({ maxValidBidQ96: undefined, tokenValueQ96: 500n })

    rerender({ maxValidBidQ96: CEILING, tokenValueQ96: 500n })

    expect(onRecap).not.toHaveBeenCalled()
  })

  it('does not fire again while the ceiling holds steady', () => {
    // Otherwise every later keystroke would be pushed back through the write path.
    const { rerender, onRecap } = setup({ maxValidBidQ96: undefined, tokenValueQ96: 5000n })
    rerender({ maxValidBidQ96: CEILING, tokenValueQ96: 5000n })
    rerender({ maxValidBidQ96: CEILING, tokenValueQ96: 6000n })
    rerender({ maxValidBidQ96: CEILING, tokenValueQ96: 7000n })

    expect(onRecap).toHaveBeenCalledTimes(1)
  })

  it('stays silent when the auction has no ceiling at all', () => {
    const { rerender, onRecap } = setup({ maxValidBidQ96: undefined, tokenValueQ96: 5000n })

    rerender({ maxValidBidQ96: undefined, tokenValueQ96: 9000n })

    expect(onRecap).not.toHaveBeenCalled()
  })
})
