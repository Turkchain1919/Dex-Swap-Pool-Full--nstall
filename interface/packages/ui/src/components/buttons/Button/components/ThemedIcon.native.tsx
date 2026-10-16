// No glyph injection here, unlike the web leg: react-native-svg inherits nothing from a
// class, so `ThemedIconCompat.native` already clones a concrete colour and size onto the glyph.
export { ThemedIconCompat as ThemedIcon } from '@universe/mycelium/button-frame-compat'
export type { ThemedIconCompatProps as ThemedIconProps } from '@universe/mycelium/button-frame-compat'
