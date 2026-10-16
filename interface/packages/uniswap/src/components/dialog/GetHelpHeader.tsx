import { type FlexCompatProps as FlexProps } from '@universe/mycelium'
import { ReactNode } from 'react'
import { NotImplementedError } from 'utilities/src/errors'

export type GetHelpHeaderProps = {
  closeModal: () => void
  link?: string
  title?: ReactNode
  goBack?: () => void
  closeDataTestId?: string
  className?: string
} & FlexProps

export function GetHelpHeader(_props: GetHelpHeaderProps): JSX.Element {
  throw new NotImplementedError('GetHelpHeader is implemented for web and native')
}
