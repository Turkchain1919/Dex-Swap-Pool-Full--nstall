import type { ComponentProps } from 'react'
import { SAMPLE_SEED_ADDRESS_1 } from 'uniswap/src/test/fixtures'
import WalletPreviewCard from 'wallet/src/components/WalletPreviewCard/WalletPreviewCard'
import { render } from 'wallet/src/test/test-utils'

const { checkColorSpy } = vi.hoisted(() => ({ checkColorSpy: vi.fn() }))

// The icon renders no color into the DOM, so the snapshot cannot cover it; spy on the prop instead.
vi.mock('@universe/mycelium/icons/Check', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/mycelium/icons/Check')>()
  const ActualCheck = actual.Check
  function Check(props: ComponentProps<typeof ActualCheck>): JSX.Element {
    checkColorSpy(props.color)
    return <ActualCheck {...props} />
  }
  return { ...actual, Check }
})

it('renders wallet preview card', () => {
  const tree = render(<WalletPreviewCard selected address={SAMPLE_SEED_ADDRESS_1} onSelect={(): null => null} />)
  expect(tree).toMatchSnapshot()
})

it('passes accent1 to the selection check icon', () => {
  render(<WalletPreviewCard selected address={SAMPLE_SEED_ADDRESS_1} onSelect={(): null => null} />)

  expect(checkColorSpy).toHaveBeenLastCalledWith('$accent1')
})
