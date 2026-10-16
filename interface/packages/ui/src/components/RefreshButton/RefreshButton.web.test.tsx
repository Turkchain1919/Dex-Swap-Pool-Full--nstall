import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// expo-blur is a transitive dep of TouchableArea and ships JSX in a `.js` file that Vite
// refuses to parse.
vi.mock('expo-blur', () => ({
  BlurView: () => null,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { RefreshButton } from 'ui/src/components/RefreshButton/RefreshButton'
import { SharedUIUniswapProvider } from 'ui/src/test/render'

function renderRefreshButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return render(
    <SharedUIUniswapProvider>
      <RefreshButton disabled={disabled} isLoading={false} onPress={onPress} />
    </SharedUIUniswapProvider>,
  )
}

describe('RefreshButton keyboard shortcut', () => {
  const onPress = vi.fn()

  beforeEach(() => {
    onPress.mockClear()
  })

  it.each(['r', 'R'])('refreshes when %s is pressed', (key) => {
    renderRefreshButton({ onPress })

    fireEvent.keyDown(document.body, { key })

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it.each(['r', 'R'])('does not refresh when %s is pressed while disabled', (key) => {
    renderRefreshButton({ onPress, disabled: true })

    fireEvent.keyDown(document.body, { key })

    expect(onPress).not.toHaveBeenCalled()
  })

  it('stops responding once disabled', () => {
    const { rerender } = renderRefreshButton({ onPress })

    fireEvent.keyDown(document.body, { key: 'r' })
    expect(onPress).toHaveBeenCalledTimes(1)

    rerender(
      <SharedUIUniswapProvider>
        <RefreshButton disabled isLoading={false} onPress={onPress} />
      </SharedUIUniswapProvider>,
    )
    fireEvent.keyDown(document.body, { key: 'r' })

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not refresh while typing in a text field', () => {
    renderRefreshButton({ onPress })
    const input = document.createElement('input')
    document.body.appendChild(input)

    fireEvent.keyDown(input, { key: 'r' })

    expect(onPress).not.toHaveBeenCalled()
    input.remove()
  })
})
