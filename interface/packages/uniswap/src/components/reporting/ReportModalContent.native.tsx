import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { spacing } from '@universe/mycelium'
import type { ReportModalContentProps } from 'uniswap/src/components/reporting/ReportModalContent'
import { useAppInsets } from 'uniswap/src/hooks/useAppInsets'

export function ReportModalContent({ children }: ReportModalContentProps): JSX.Element {
  const insets = useAppInsets()

  return (
    <BottomSheetScrollView
      contentContainerStyle={{
        padding: spacing.spacing12,
        paddingBottom: Math.max(spacing.spacing12, insets.bottom),
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </BottomSheetScrollView>
  )
}
