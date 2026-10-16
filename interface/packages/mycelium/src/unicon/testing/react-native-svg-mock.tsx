/**
 * Minimal react-native-svg stand-in for the unicon vitest suites (the real
 * module ships CJS that requires react-native's flow sources), mirroring
 * `modal-close-icon/testing/react-native-svg-mock.tsx` extended with the
 * shape primitives the native Unicon leg draws. Elements mount as passthrough
 * hosts so the render suite can walk the drawn geometry.
 */
import { createElement, forwardRef, type ComponentType, type ReactNode } from 'react'

type SvgProps = Record<string, unknown> & { children?: ReactNode }

function host(name: string): ComponentType<SvgProps> {
  const Component = forwardRef<unknown, SvgProps>((props, ref) => createElement(`Svg.${name}`, { ...props, ref }))
  Component.displayName = name
  return Component as unknown as ComponentType<SvgProps>
}

export const Svg = host('Svg')
export const Circle = host('Circle')
export const G = host('G')
export const Path = host('Path')

export default Svg
