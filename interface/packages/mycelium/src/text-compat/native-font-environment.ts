/**
 * Platformless base of the environment probe the Text native style lane reads
 * (see the .native leg for the real values). The style lane's output is only
 * ever consumed by TextCompat.native, so off-native resolutions (this file and
 * the .web twin) exist for typecheck and the jsdom test configs; they pin the
 * deterministic web-equivalent column: iOS naming and `smallFont: true`, under
 * which the native ramp equals the web ramp by construction (adjustedSize is
 * the identity — see native-font.ts).
 */
import type { NativeFontEnvironment } from './native-font'

export function nativeFontEnvironment(): NativeFontEnvironment {
  return { platform: 'ios', smallFont: true }
}
