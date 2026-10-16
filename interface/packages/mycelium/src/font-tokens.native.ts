/**
 * Native leg of the `fonts` token table: the web leg's variants resolved for
 * the device — ui's `adjustedSize` ramp applied and the real React Native
 * family named, neither of which the flat web-parity table carried.
 */
import { nativeFontsTable } from './native-fonts-table'
import { nativeFontEnvironment } from './text-compat/native-font-environment'

export type { FontVariantName, ResolvedFontToken } from './font-tokens.web'

export const fonts = nativeFontsTable(nativeFontEnvironment())
