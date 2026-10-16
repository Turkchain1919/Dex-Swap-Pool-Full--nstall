import { Portal as PrimitivePortal } from '@rn-primitives/portal'
import { useId } from 'react'
import { StyleSheet, View } from 'react-native'
import { APP_PORTAL_HOST_NAME } from 'ui/src/components/portal/AppPortalHost'
import type { PortalProps } from 'ui/src/components/portal/Portal'

/**
 * Native portal on `@rn-primitives/portal`, replacing Tamagui's Portal (Tamagui → rn-primitives
 * migration). Children teleport to `AppPortalHost` — mounted inside the root Tamagui provider in
 * the same position Tamagui's `PortalProvider` mounted its root host — wrapped in the same
 * full-window, absolutely-positioned, `box-none` view Tamagui used, so full-screen overlay
 * placement and touch pass-through are unchanged.
 *
 * Z-order: portals stack by mount order within the host; a numeric `zIndex`/`stackZIndex` lifts a
 * portal above siblings (Tamagui's auto-incrementing stack resolved to 1 when neither was given,
 * so that is the default here too).
 */
export function Portal({ children, zIndex, stackZIndex }: PortalProps): JSX.Element {
  const name = useId()
  const resolvedZIndex = zIndex ?? stackZIndex ?? 1

  return (
    <PrimitivePortal hostName={APP_PORTAL_HOST_NAME} name={name}>
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: resolvedZIndex }]}>
        {children}
      </View>
    </PrimitivePortal>
  )
}
