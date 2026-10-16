/**
 * Minimal react-native stand-in for the unicon vitest suites (the real module
 * ships flow sources vitest cannot parse), mirroring
 * `floating-overlay/testing/react-native-mock.tsx` reduced to what the native
 * Unicon leg touches. Test files alias the real module via
 * `vi.mock('react-native', () => import('./testing/react-native-mock'))`.
 */
import {
  createElement,
  type ForwardRefExoticComponent,
  forwardRef,
  type PropsWithoutRef,
  type ReactNode,
  type RefAttributes,
} from 'react'

type HostProps = Record<string, unknown> & { children?: ReactNode }
type HostComponent = ForwardRefExoticComponent<PropsWithoutRef<HostProps> & RefAttributes<unknown>>

function host(type: string): HostComponent {
  const Host = forwardRef<unknown, HostProps>((props, ref) => createElement(type, { ...props, ref }))
  Host.displayName = type
  return Host
}

export const View = host('View')

export const StyleSheet = {
  create<T>(styles: T): T {
    return styles
  },
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  flatten(style: unknown): unknown {
    return style
  },
}
