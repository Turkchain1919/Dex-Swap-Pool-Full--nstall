import { render } from '@testing-library/react'
import { EffectiveOverlayZIndexContext } from '@universe/mycelium/popover-compat'
import { useContext } from 'react'
import { DualZIndexProvider, EffectiveModalOrSheetZIndexContext } from 'ui/src/components/modal/AdaptiveWebModalShared'
import { describe, expect, it } from 'vitest'

// A converted descendant reads only the mycelium context — it never falls
// back to the legacy one. This proves the bridge, not just that both
// providers mounted.
function MyceliumConsumer(): JSX.Element {
  const value = useContext(EffectiveOverlayZIndexContext)
  return <div data-testid="mycelium">{String(value)}</div>
}

function LegacyConsumer(): JSX.Element {
  const value = useContext(EffectiveModalOrSheetZIndexContext)
  return <div data-testid="legacy">{String(value)}</div>
}

describe('DualZIndexProvider (INFRA-3819)', () => {
  it('bridges a legacy overlay host to a mycelium-only descendant', () => {
    const { getByTestId } = render(
      <DualZIndexProvider value={1060}>
        <MyceliumConsumer />
      </DualZIndexProvider>,
    )
    expect(getByTestId('mycelium').textContent).toBe('1060')
  })

  it('still provides the legacy context for unconverted descendants', () => {
    const { getByTestId } = render(
      <DualZIndexProvider value={1060}>
        <LegacyConsumer />
      </DualZIndexProvider>,
    )
    expect(getByTestId('legacy').textContent).toBe('1060')
  })

  it('provides both contexts with the same value simultaneously', () => {
    const { getByTestId } = render(
      <DualZIndexProvider value={1070}>
        <MyceliumConsumer />
        <LegacyConsumer />
      </DualZIndexProvider>,
    )
    expect(getByTestId('mycelium').textContent).toBe('1070')
    expect(getByTestId('legacy').textContent).toBe('1070')
  })

  it('passes undefined through to both contexts (no host layer)', () => {
    const { getByTestId } = render(
      <DualZIndexProvider value={undefined}>
        <MyceliumConsumer />
        <LegacyConsumer />
      </DualZIndexProvider>,
    )
    expect(getByTestId('mycelium').textContent).toBe('undefined')
    expect(getByTestId('legacy').textContent).toBe('undefined')
  })
})
