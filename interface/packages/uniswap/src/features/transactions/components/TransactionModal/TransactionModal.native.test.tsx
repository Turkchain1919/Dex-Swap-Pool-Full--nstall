import type { ComponentType, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { TransactionModal } from 'uniswap/src/features/transactions/components/TransactionModal/TransactionModal.native'
import {
  TransactionScreen,
  useTransactionModalContext,
} from 'uniswap/src/features/transactions/components/TransactionModal/TransactionModalContext'
import { fireEvent, render } from 'uniswap/src/test/test-utils'

// jsdom resolves this platform-split hook's `.web` leg, which throws instead of returning a value.
vi.mock('uniswap/src/utils/useKeyboardLayout', () => ({
  useKeyboardLayout: () => ({ isVisible: false, containerHeight: 0 }),
}))

// The setup file swaps `Modal` for a div. The derivation under test lives in the native leg.
vi.mock('uniswap/src/components/modals/Modal', async () => {
  return await vi.importActual('uniswap/src/components/modals/Modal.native')
})

const mountSpy = vi.hoisted(() => vi.fn())
const contentPanningSpy = vi.hoisted(() => vi.fn())

// Mirrors the one gorhom behaviour in question. @gorhom/bottom-sheet 5.2.13, BottomSheetContent.tsx:261-263:
//   const DraggableView = enableContentPanningGesture ? BottomSheetDraggableView : Animated.View
// It is recomputed on every render, so a change in the flag changes the element type wrapping the sheet's children.
vi.mock('@gorhom/bottom-sheet', async () => {
  const React = await import('react')
  const { View: RNView } = (await import('react-native')) as unknown as {
    View: ComponentType<{ children?: ReactNode }>
  }
  function DraggableView({ children }: { children?: ReactNode }): JSX.Element {
    return React.createElement(RNView, null, children)
  }
  function PlainView({ children }: { children?: ReactNode }): JSX.Element {
    return React.createElement(RNView, null, children)
  }
  return {
    BottomSheetModal: ({
      enableContentPanningGesture,
      children,
    }: {
      enableContentPanningGesture?: boolean
      children?: ReactNode
    }) => {
      contentPanningSpy(enableContentPanningGesture)
      const Wrapper = enableContentPanningGesture ? DraggableView : PlainView
      return React.createElement(Wrapper, null, children)
    },
    BottomSheetBackdrop: RNView,
    BottomSheetView: RNView,
    BottomSheetTextInput: RNView,
    BottomSheetFooter: RNView,
    KEYBOARD_STATUS: { SHOWN: 'SHOWN' },
    useBottomSheetInternal: () => ({}),
  }
})

// Stands in for SendFlow's SendContextProvider: form state in a plain useState, mounted inside the sheet.
function SendFormStandIn(): JSX.Element {
  const { screen, setScreen } = useTransactionModalContext()
  const [recipient, setRecipient] = useState<string | undefined>(undefined)

  useEffect(() => {
    mountSpy()
  }, [])

  return (
    <View>
      <Text>{`screen:${screen}`}</Text>
      <Text>{`recipient:${recipient ?? 'none'}`}</Text>
      <Pressable testID="pick" onPress={() => setRecipient('vitalik.eth')}>
        <Text>pick</Text>
      </Pressable>
      <Pressable testID="review" onPress={() => setScreen(TransactionScreen.Review)}>
        <Text>review</Text>
      </Pressable>
    </View>
  )
}

describe('TransactionModal Form to Review', () => {
  it('keeps enableContentPanningGesture constant so the sheet does not remount its children', () => {
    const { getByTestId, getByText, queryByText } = render(
      <TransactionModal modalName={ModalName.Send} onClose={vi.fn()}>
        <SendFormStandIn />
      </TransactionModal>,
    )

    fireEvent.press(getByTestId('pick'))
    expect(getByText('recipient:vitalik.eth')).toBeTruthy()
    expect(mountSpy).toHaveBeenCalledTimes(1)

    fireEvent.press(getByTestId('review'))
    expect(getByText(`screen:${TransactionScreen.Review}`)).toBeTruthy()

    // Soft so one run reports every link: the flag flip, the remount, and the lost form state.
    const panningValuesSeen = new Set(contentPanningSpy.mock.calls.map(([value]) => value))
    expect.soft([...panningValuesSeen], 'enableContentPanningGesture values gorhom saw').toEqual([true])
    expect.soft(mountSpy, 'child mount count').toHaveBeenCalledTimes(1)
    expect.soft(queryByText('recipient:vitalik.eth'), 'recipient after Review').not.toBeNull()
    expect.soft(queryByText('recipient:none'), 'reset recipient after Review').toBeNull()
  })
})
