import { DropdownMenuSheetItemCompat } from '@universe/mycelium/menu-compat'
import type { DropdownMenuSheetItemProps } from 'ui/src/components/dropdownMenuSheet/DropdownMenuSheetItem'

/**
 * Web leg: delegates to the parity-verified `DropdownMenuSheetItemCompat`
 * (INFRA-3021). `@universe/mycelium/menu-compat` has no native leg, so native
 * renders through `DropdownMenuSheetItem.native.tsx` instead.
 */
export function DropdownMenuSheetItem(props: DropdownMenuSheetItemProps): JSX.Element {
  return <DropdownMenuSheetItemCompat {...props} />
}
