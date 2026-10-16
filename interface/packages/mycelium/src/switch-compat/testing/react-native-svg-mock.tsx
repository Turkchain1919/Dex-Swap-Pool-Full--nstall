/**
 * Minimal react-native-svg stand-in for the switch/spinning-loader compat
 * vitest suites (jsdom env) — the button-compat mock's surface plus `Line`,
 * which the Switch check glyph draws. The real module is exercised by the
 * packages/tailwind native parity harness.
 */
import { createElement, forwardRef, type ComponentType, type ReactNode } from 'react'

type HostProps = Record<string, unknown> & { children?: ReactNode }

function host(type: string): ComponentType<HostProps> {
  const Host = forwardRef<unknown, HostProps>((props, ref) => createElement(type, { ...props, ref }))
  Host.displayName = type
  return Host as unknown as ComponentType<HostProps>
}

export const Svg = host('Svg')
export const Path = host('Path')
export const Circle = host('Circle')
export const Line = host('Line')
export const G = host('G')

export default Svg
