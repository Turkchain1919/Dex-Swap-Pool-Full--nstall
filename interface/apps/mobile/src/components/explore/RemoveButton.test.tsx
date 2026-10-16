import RemoveButton from 'src/components/explore/RemoveButton'
import { fireEvent, getNearestFiberProp, render } from 'src/test/test-utils'
import { ON_PRESS_EVENT_PAYLOAD } from 'uniswap/src/test/fixtures'

describe(RemoveButton, () => {
  it('renders without error', () => {
    const tree = render(<RemoveButton />)

    expect(tree.toJSON()).toMatchSnapshot()
  })

  it('calls onPress when pressed', () => {
    const onPress = vi.fn()
    const { getByTestId } = render(<RemoveButton onPress={onPress} />)

    const button = getByTestId('explore/remove-button')
    fireEvent.press(button, ON_PRESS_EVENT_PAYLOAD)

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  // Compat styles resolve through uniwind at runtime and never appear as jsdom
  // inline styles, so assert the opacity prop on the primitive plus the
  // disabled contract on the host.
  describe('visibility', () => {
    it('is opaque and pressable when visible', () => {
      const { getByTestId } = render(<RemoveButton visible />)

      const button = getByTestId('explore/remove-button') as unknown as HTMLElement

      expect(getNearestFiberProp(button, 'opacity')).toBe(1)
      expect(button.getAttribute('aria-disabled')).toBeNull()
    })

    it('is transparent and disabled when not visible', () => {
      const { getByTestId } = render(<RemoveButton visible={false} />)

      const button = getByTestId('explore/remove-button') as unknown as HTMLElement

      expect(getNearestFiberProp(button, 'opacity')).toBe(0)
      expect(button.getAttribute('aria-disabled')).toBe('true')
    })
  })
})
