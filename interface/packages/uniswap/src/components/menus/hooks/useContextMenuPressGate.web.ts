import type {
  UseContextMenuPressGateParams,
  UseContextMenuPressGateResult,
} from 'uniswap/src/components/menus/hooks/useContextMenuPressGate'
import { useEvent } from 'utilities/src/react/hooks'
import { noop } from 'utilities/src/react/noop'

/** Native-only — used with react-native-context-menu-view on mobile. */
export function useContextMenuPressGate({ onPress }: UseContextMenuPressGateParams): UseContextMenuPressGateResult {
  const handlePress = useEvent(() => {
    onPress?.()
  })

  return { onPressIn: noop, onPressOut: noop, handlePress }
}
