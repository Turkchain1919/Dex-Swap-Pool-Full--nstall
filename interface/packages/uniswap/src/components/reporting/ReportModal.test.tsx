import { ChartBarCrossed } from '@universe/mycelium/icons/ChartBarCrossed'
import type { ReactNode } from 'react'
import { ReportModal } from 'uniswap/src/components/reporting/ReportModal'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { render } from 'uniswap/src/test/test-utils'

const modalPropsSpy = vi.hoisted(() => vi.fn())

vi.mock('@universe/environment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@universe/environment')>()),
  isAndroid: false,
  isIOS: true,
  isMobileApp: true,
  isMobileWeb: false,
  isWebPlatform: false,
}))

vi.mock('uniswap/src/components/modals/Modal', () => ({
  Modal: (props: { children: ReactNode }) => {
    modalPropsSpy(props)
    return props.children
  },
}))

vi.mock('uniswap/src/components/modals/useBottomSheetSafeKeyboard', () => ({
  useBottomSheetSafeKeyboard: () => ({ keyboardHeight: 0 }),
}))

vi.mock('uniswap/src/components/reporting/ReportModalContent', () => ({
  ReportModalContent: ({ children }: { children: ReactNode }) => children,
}))

describe(ReportModal, () => {
  it('uses the iOS keyboard-safe sheet behavior', () => {
    render(
      <ReportModal
        isOpen
        modalName={ModalName.ReportTokenData}
        modalTitle="Report data issue"
        icon={ChartBarCrossed}
        reportOptions={[]}
        submitReport={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(modalPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        enableBlurKeyboardOnGesture: true,
        keyboardBehavior: 'fillParent',
        keyboardBlurBehavior: 'restore',
      }),
    )
  })

  it('gives the iOS sheet no snap points, so it derives content panning off', () => {
    render(
      <ReportModal
        isOpen
        modalName={ModalName.ReportTokenData}
        modalTitle="Report data issue"
        icon={ChartBarCrossed}
        reportOptions={[]}
        submitReport={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(modalPropsSpy.mock.calls[0]?.[0].snapPoints).toBeUndefined()
  })
})
