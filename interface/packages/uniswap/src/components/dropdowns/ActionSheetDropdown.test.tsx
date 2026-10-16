import { Text } from '@universe/mycelium'
import { ActionSheetDropdown } from 'uniswap/src/components/dropdowns/ActionSheetDropdown'
import { MenuItemProp } from 'uniswap/src/components/modals/ActionSheetModal'
import { ON_PRESS_EVENT_PAYLOAD } from 'uniswap/src/test/fixtures'
import { fireEvent, render, screen, waitFor } from 'uniswap/src/test/test-utils'

const createOption = (key: string, label: string): MenuItemProp => ({
  key,
  onPress: vi.fn(),
  render: () => <Text>{label}</Text>,
})

const options: MenuItemProp[] = [
  createOption('option1', 'Option 1'),
  createOption('option2', 'Option 2'),
  createOption('option3', 'Option 3'),
]

const openDropdown = async (): Promise<void> => {
  const toggle = screen.getByTestId('dropdown-toggle')

  fireEvent.press(toggle, ON_PRESS_EVENT_PAYLOAD)

  // Wait until is open
  await waitFor(() => expect(screen.queryByTestId('dropdown-content')).toBeTruthy())
}

describe(ActionSheetDropdown, () => {
  it('should render', () => {
    const tree = render(<ActionSheetDropdown options={options} />)

    expect(tree).toMatchSnapshot()
  })

  it('opens the dropdown when the toggle is pressed', async () => {
    render(<ActionSheetDropdown options={options} />)

    // Should be closed by default
    expect(screen.queryByTestId('dropdown-content')).toBeNull()

    await openDropdown()

    // Should render all options
    options.forEach(({ key }) => expect(screen.queryByTestId(key)).toBeTruthy())
  })
  it('closes the dropdown after pressing on a backdrop', async () => {
    const { getByTestId } = render(<ActionSheetDropdown options={options} />)
    await openDropdown()

    const backdrop = getByTestId('dropdown-backdrop')

    fireEvent.press(backdrop, ON_PRESS_EVENT_PAYLOAD)

    // Should be closed after pressing the backdrop. `Presence` takes its instant lane under
    // `isTestEnv`, so the content is gone synchronously — hence a direct assertion rather than
    // `waitForElementToBeRemoved`, which requires the node to still be present when it is called.
    await waitFor(() => expect(screen.queryByTestId('dropdown-content')).toBeNull())
  })
  it('closes the dropdown after pressing on an option', async () => {
    const { getByTestId } = render(<ActionSheetDropdown options={options} />)

    await openDropdown()

    const option = getByTestId('option1')

    fireEvent.press(option, ON_PRESS_EVENT_PAYLOAD)

    // Should be closed after pressing an option (removed synchronously — see above)
    await waitFor(() => expect(screen.queryByTestId('dropdown-content')).toBeNull())
  })
  it('calls the onPress function of the option after pressing on an option', async () => {
    const { getByTestId } = render(<ActionSheetDropdown options={options} />)

    await openDropdown()

    const option = getByTestId('option3')

    fireEvent.press(option, ON_PRESS_EVENT_PAYLOAD)

    await waitFor(() => {
      // Should call the onPress function of the option
      expect(options[2]?.onPress).toHaveBeenCalledTimes(1)
    })
  })
})
