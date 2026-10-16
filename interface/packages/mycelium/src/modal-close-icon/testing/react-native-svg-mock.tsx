/**
 * Minimal react-native-svg stand-in for the modal-close-icon vitest suites
 * (the real module ships CJS that requires react-native's flow sources),
 * mirroring `button-compat/testing/react-native-svg-mock.tsx`. Elements mount
 * as passthrough hosts; the export-parity suite only needs the `.native` leg
 * to import under jsdom.
 */
import { createElement, forwardRef, type ComponentType, type ReactNode } from 'react'

type SvgProps = Record<string, unknown> & { children?: ReactNode }

function host(name: string): ComponentType<SvgProps> {
  const Component = forwardRef<unknown, SvgProps>((props, ref) => createElement(`Svg.${name}`, { ...props, ref }))
  Component.displayName = name
  return Component as unknown as ComponentType<SvgProps>
}

export const Svg = host('Svg')
export const Path = host('Path')

export default Svg
