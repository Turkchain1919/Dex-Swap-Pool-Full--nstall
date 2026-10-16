/**
 * Web leg of the platform split — mirrors the platformless base (see its
 * header): the native style lane is never consumed on web, so this exists for
 * bundlers/test configs that resolve `.web.*` first and must not pull
 * `react-native` into a web graph.
 */
import type { NativeFontEnvironment } from './native-font'

export function nativeFontEnvironment(): NativeFontEnvironment {
  return { platform: 'ios', smallFont: true }
}
