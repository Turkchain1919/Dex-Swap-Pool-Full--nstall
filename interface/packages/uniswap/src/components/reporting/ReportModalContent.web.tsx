import { Flex } from '@universe/mycelium'
import type { ReportModalContentProps } from 'uniswap/src/components/reporting/ReportModalContent'

export function ReportModalContent({ children }: ReportModalContentProps): JSX.Element {
  return <Flex>{children}</Flex>
}
