import type { TextCompatProps } from '@universe/mycelium'
import type { Role } from 'react-native'
import { PlatformSplitStubError } from 'utilities/src/errors'

export type DropdownMenuSheetItemProps = {
  label: string
  icon?: React.ReactNode
  actionType?: 'default' | 'external-link'
  isSelected?: boolean
  disabled?: boolean
  destructive?: boolean
  closeDelay?: number
  textColor?: TextCompatProps['color']
  variant: 'small' | 'medium'
  height?: number
  role?: Role
  subheader?: string
  rightElement?: React.ReactNode
  allowMultiline?: boolean
  onPress: () => void
  handleCloseMenu?: () => void
}

/**
 * Platform-split base stub — bundlers resolve `DropdownMenuSheetItem.web` /
 * `DropdownMenuSheetItem.native` (the `ui/src` convention, see `Portal.tsx`).
 */
export function DropdownMenuSheetItem(_props: DropdownMenuSheetItemProps): JSX.Element {
  throw new PlatformSplitStubError('DropdownMenuSheetItem')
}
