/**
 * Text props CSS inherits to a primitive's text-descendant children
 * regardless of which ancestor declares them — legacy Tamagui accepted these
 * on any component's `$platform-web`, not just Text's own surface (e.g.
 * `<Flex $platform-web={{ textAlign: 'center' }}>` centers its text children
 * via inheritance). `$platform-web` is the only sane home for this on
 * non-Text primitives: RN has no CSS cascade, so a native Text child needs
 * its own `textAlign` regardless, and this hint is class-lane only — a
 * documented no-op on native (`native-style-membership.ts`), matching
 * legacy's web-only effect. Deliberately narrow (INFRA-3673): the
 * `ClickableTamaguiStyle` keys (textDecoration family) have their own fix
 * path via INFRA-3455, and the whiteSpace token-interop gap is INFRA-3496 —
 * neither belongs here.
 *
 * Split out of `props.ts` to stay under that file's `max-lines` budget.
 */
export interface InheritedTextStyleProps {
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify' | 'start' | 'end' | 'unset'
}
