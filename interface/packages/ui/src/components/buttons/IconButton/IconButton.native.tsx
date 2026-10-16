// No glyph injection here, unlike the web leg: react-native-svg inherits nothing from a
// class, so `ThemedIconCompat.native` already clones a concrete colour and size onto the glyph.
// Root barrel, not a subpath: `icon-button-compat` is deliberately barrel-only in mycelium.
export { IconButton, type IconButtonProps } from '@universe/mycelium'
