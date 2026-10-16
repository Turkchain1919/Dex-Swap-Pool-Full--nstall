/**
 * Minimal `react-native` stand-in for the compat platform-leg suites
 * (`flex-compat` / `text-compat` / `view-compat` `platform-legs.test.ts`).
 *
 * The mycelium vitest config runs jsdom with `.web.*` resolved FIRST and no
 * `.native.*` entry, so a native leg is only reachable through an explicit
 * `./X.native` specifier plus `vi.mock('react-native', …)` — the
 * `floating-overlay/testing/react-native-mock.tsx` contract. That mock has no
 * `Text` host, and adding one there would change an unrelated suite's surface,
 * so the compat legs get their own alongside it.
 *
 * Hosts render as plain host elements named after the RN component so
 * `container.querySelector('view')`-style assertions and
 * `react-test-renderer`'s `findByType` both work, and every prop (className and
 * the resolved `style` array included) stays inspectable.
 */
import {
  createElement,
  type ForwardRefExoticComponent,
  forwardRef,
  type PropsWithoutRef,
  type ReactNode,
  type RefAttributes,
} from 'react'

export * from './window-dimensions-mock'

type HostProps = Record<string, unknown> & { children?: ReactNode }
type HostComponent = ForwardRefExoticComponent<PropsWithoutRef<HostProps> & RefAttributes<unknown>>

function host(type: string): HostComponent {
  const Host = forwardRef<unknown, HostProps>((props, ref) => createElement(type, { ...props, ref }))
  Host.displayName = type
  return Host
}

export const View = host('RNView')
export const Text = host('RNText')
export const Pressable = host('RNPressable')

export const Platform = {
  OS: 'ios',
  select<T>(spec: { ios?: T; android?: T; native?: T; default?: T }): T | undefined {
    return spec.ios ?? spec.native ?? spec.default
  },
  Version: 17,
  isTV: false,
}

type StyleObject = Record<string, unknown>
type StylePropValue = StyleObject | StylePropValue[] | null | undefined | false

export const StyleSheet = {
  create<T>(styles: T): T {
    return styles
  },
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  flatten(style: StylePropValue): StyleObject {
    if (style === null || style === undefined || style === false) {
      return {}
    }
    if (Array.isArray(style)) {
      const out: StyleObject = {}
      for (const part of style) {
        Object.assign(out, StyleSheet.flatten(part))
      }
      return out
    }
    return style
  },
}
