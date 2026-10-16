/**
 * The `TouchableTextLink` compat prop contract (INFRA-3487): the legacy
 * `TouchableTextLinkProps` surface
 * (`ui/src/components/touchable/TouchableTextLink/TouchableTextLink.tsx`)
 * carried name-for-name, composed from the same three pieces as the legacy
 * type — Text picks, TouchableArea picks, and the component's own props — so
 * `<TouchableTextLink link={…}>…</TouchableTextLink>` call sites convert as a
 * mechanical barrel swap.
 *
 * A closed surface with no rest spread, exactly like legacy — an attribute
 * outside it fails typecheck on both systems, so the swap needs no codemod
 * prop gate.
 */
import type { TextCompatProps } from '../text-compat/props'
import type { TouchableAreaCompatProps } from '../touchable-area/props'

type PropsFromText = Pick<
  TextCompatProps,
  'textTransform' | 'allowFontScaling' | 'adjustsFontSizeToFit' | 'textAlign' | 'flex' | 'flexGrow' | 'flexShrink'
>

type PropsFromTouchableArea = Pick<
  TouchableAreaCompatProps,
  'onPress' | 'disabled' | 'disabledStyle' | 'forceStyle' | 'display'
>

/** The legacy variant subset — TouchableTextLink renders button-label typography only. */
export type TouchableTextLinkVariant = 'buttonLabel1' | 'buttonLabel2' | 'buttonLabel3' | 'buttonLabel4'

/**
 * The legacy color subset. Every member has a `*Hovered` counterpart in the
 * spore palette, which is what the hover/focus color swap resolves to.
 */
export type TouchableTextLinkColor =
  | '$neutral1'
  | '$neutral2'
  | '$neutral3'
  | '$accent1'
  | '$statusSuccess'
  | '$statusWarning'
  | '$statusCritical'

/** Exported for declaration emit (TS4023) — consumers use `TouchableTextLinkProps`. */
export interface TouchableTextLinkOwnProps {
  children: string
  variant?: TouchableTextLinkVariant
  color?: TouchableTextLinkColor
  /** The URL: web renders an anchor (`<a>`); native opens the device browser on press. */
  link: string
  target?: TextCompatProps['target']
  /**
   * If true, renders only the Text (no touchable frame) — for inline links
   * rendered as a child of another Text.
   */
  onlyUseText?: boolean
  /** If true, skips the default focus underline. */
  noUnderline?: boolean
}

export type TouchableTextLinkProps = PropsFromText & PropsFromTouchableArea & TouchableTextLinkOwnProps

/** Legacy defaults (`TouchableTextLink.tsx`). */
export const DEFAULT_LINK_VARIANT: TouchableTextLinkVariant = 'buttonLabel1'
export const DEFAULT_LINK_COLOR: TouchableTextLinkColor = '$neutral1'
export const DEFAULT_LINK_TARGET = '_blank'
/** The text color the legacy component renders while disabled. */
export const DISABLED_LINK_COLOR = '$neutral2'
