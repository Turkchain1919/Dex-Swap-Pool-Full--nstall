/**
 * The NATIVE leg's public prop surface — deliberately the SAME exported name
 * as the web leg's (`ButtonFrameCompatProps`), with the RN shape divergences
 * (`../button-compat/native-props` precedent): RNGH press handlers and an RN
 * `style`. `export-type-parity.test.ts` pins the name set across the legs and
 * the per-prop divergences by reason. Types only; RN / RNGH imports are
 * type-only so any graph can resolve this file.
 */
import type { StyleProp, ViewStyle } from 'react-native'
import type { PressableProps } from 'react-native-gesture-handler'
import type { ButtonFrameOpenProps } from './compile'
import type { ButtonFrameVariantProps } from './props'

export type ButtonFramePressHandler = NonNullable<PressableProps['onPress']>

export type ButtonFrameCompatProps = Omit<ButtonFrameOpenProps, 'style' | 'onPress'> &
  Omit<ButtonFrameVariantProps, 'onDisabledPress'> & {
    onPress?: ButtonFramePressHandler
    onDisabledPress?: ButtonFramePressHandler
    style?: StyleProp<ViewStyle>
    [key: `data-${string}`]: string | number | boolean | undefined
  }
