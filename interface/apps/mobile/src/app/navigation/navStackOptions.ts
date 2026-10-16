import { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { StackNavigationOptions } from '@react-navigation/stack'

export const navNativeStackOptions = {
  noHeader: { headerShown: false },
  presentationModal: { presentation: 'modal' },
  presentationBottomSheet: {
    presentation: 'containedTransparentModal',
    animation: 'none',
    animationDuration: 0,
    contentStyle: { backgroundColor: 'transparent' },
  },
  independentBsm: {
    fullScreenGestureEnabled: true,
    gestureEnabled: true,
    headerShown: false,
    animation: 'slide_from_right',
  },
  // Opt out of the global enableFreeze for screens hosting eagerly mounted subtrees (e.g. the tabs
  // screen): a transparent modal (bottom sheets) marks everything below it visible, so each
  // open/close thaws the subtree and re-runs every effect in it — seconds of blocked JS under Fabric.
  noFreezeOnBlur: { freezeOnBlur: false },
} as const satisfies Record<string, NativeStackNavigationOptions>

export const navStackOptions = {
  noHeader: { headerShown: false },
} as const satisfies Record<string, StackNavigationOptions>
