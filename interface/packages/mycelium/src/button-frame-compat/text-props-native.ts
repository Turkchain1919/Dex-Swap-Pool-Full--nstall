/**
 * NATIVE prop surface of `ButtonTextCompat` — the same exported name as the
 * web leg's (`ButtonTextCompatProps`), with the RN `style` divergence pinned
 * by `export-type-parity.test.ts`. Types only.
 */
import type { StyleProp, TextStyle } from 'react-native'
import type { ButtonTextCompatProps as ButtonTextCompatWebProps } from './text-props'

export type ButtonTextCompatProps = Omit<ButtonTextCompatWebProps, 'style'> & {
  style?: StyleProp<TextStyle>
}
