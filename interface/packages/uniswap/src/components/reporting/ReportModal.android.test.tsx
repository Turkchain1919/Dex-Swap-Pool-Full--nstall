import { ChartBarCrossed } from '@universe/mycelium/icons/ChartBarCrossed'
import type { ReactNode } from 'react'
import { ReportModal } from 'uniswap/src/components/reporting/ReportModal'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { render } from 'uniswap/src/test/test-utils'

const modalPropsSpy = vi.hoisted(() => vi.fn())

// Sibling spec: ReportModal.test.tsx pins iOS in a module-scoped mock, so Android needs its own file.
vi.mock('@universe/environment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@universe/environment')>()),
  isAndroid: true,
  isIOS: false,
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
  it('gives the Android sheet two snap points, so it derives content panning on', () => {
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

    // `Modal` derives panning from `snapPoints.length > 1`, so dropping to one detent turns panning off.
    expect(modalPropsSpy.mock.calls[0]?.[0].snapPoints).toHaveLength(2)
    expect(modalPropsSpy.mock.calls[0]?.[0].snapPoints).toEqual(['70%', '100%'])
  })
})
