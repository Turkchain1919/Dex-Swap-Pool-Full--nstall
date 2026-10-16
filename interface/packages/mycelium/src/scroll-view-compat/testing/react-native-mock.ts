/**
 * `react-native` stand-in for the scroll-view-compat platform-leg suite: the
 * shared compat mock's hosts plus the `ScrollView` host the native leg mounts
 * (per the shared mock's contract, a suite needing more surface gets its own
 * mock alongside it instead of widening the shared one).
 */
import {
  createElement,
  type ForwardRefExoticComponent,
  forwardRef,
  type PropsWithoutRef,
  type ReactNode,
  type RefAttributes,
} from 'react'

export * from '../../compat/testing/react-native-mock'

type HostProps = Record<string, unknown> & { children?: ReactNode }
type HostComponent = ForwardRefExoticComponent<PropsWithoutRef<HostProps> & RefAttributes<unknown>>

const Host: HostComponent = forwardRef<unknown, HostProps>((props, ref) =>
  createElement('RNScrollView', { ...props, ref }),
)
Host.displayName = 'RNScrollView'

export const ScrollView = Host
