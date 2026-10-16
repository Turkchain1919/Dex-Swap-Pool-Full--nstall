/**
 * The `TouchableTextLink` compat's fixed-class contribution to the closed
 * safelist (INFRA-3217). Unlike `TextCompat`/`TouchableAreaCompat`, this
 * compat has no prop-driven className compiler of its own — it only adds one
 * always-on literal class on top of those primitives' compiled output, so
 * that literal is the only thing this module needs to register.
 */

/**
 * The legacy `$platform-web` underline geometry (`PLATFORM_WEB_PROPS`), as a
 * literal class so the consuming apps' scanners emit it. Applied
 * unconditionally by the web leg, so it must ride in the closed set the same
 * way every other compat's fixed frame chrome does.
 */
export const UNDERLINE_POSITION_CLASS = '[text-underline-position:from-font]'

/** The TouchableTextLink fixed classes contributed to the generated safelist. */
export function touchableTextLinkFixedCompatClasses(): string[] {
  return [UNDERLINE_POSITION_CLASS]
}
