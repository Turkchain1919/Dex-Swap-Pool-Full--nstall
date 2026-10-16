/**
 * `react-native` stand-in for the input-compat platform-leg suite: the shared
 * compat mock's hosts plus the `TextInput` host and `useWindowDimensions` the
 * native leg imports (per the shared mock's contract, a suite needing more
 * surface gets its own mock alongside it instead of widening the shared one).
 */
export * from '../../compat/testing/react-native-mock'
import { createElement, forwardRef, type ReactNode } from 'react'

type HostProps = Record<string, unknown> & { children?: ReactNode }

export const TextInput = forwardRef<unknown, HostProps>((props, ref) => createElement('RNTextInput', { ...props, ref }))
TextInput.displayName = 'RNTextInput'

export function useWindowDimensions(): { width: number; height: number; scale: number; fontScale: number } {
  return { width: 1024, height: 768, scale: 2, fontScale: 1 }
}
