/**
 * Minimal react-native stand-in for the checkbox-compat vitest suites, mirroring
 * `floating-overlay/testing/react-native-mock.tsx`. Host components render as
 * plain host elements so the export-parity suite can import the `.native` leg
 * under the jsdom config without Metro. Aliased per test file via
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
export const Pressable = host('Pressable')
export const Text = host('Text')

export const StyleSheet = {
  create<T>(styles: T): T {
    return styles
  },
  flatten(style: unknown): unknown {
    return style
  },
}

export const Platform = { OS: 'ios', select: <T,>(spec: { default: T }): T => spec.default }
