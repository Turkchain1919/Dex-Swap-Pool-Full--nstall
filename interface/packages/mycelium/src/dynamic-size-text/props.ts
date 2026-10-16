/**
 * The `DynamicSizeText` compat prop contract: the legacy `DynamicSizeTextProps`
 * (`ui/src/components/text/DynamicSizeText/DynamicSizeText.tsx`) — `TextProps`
 * plus the fit options — carried name-for-name on the compat Text surface, so
 * call sites convert as an import-path swap.
 */
import type { ReactNode } from 'react'
import type { TextCompatProps } from '../text-compat/props'

export interface DynamicSizeTextFitOptions {
  /** Lower bound of the web binary-search fit; ignored on native. */
  minWebFontSize?: number
  /** Upper bound of the web binary-search fit; ignored on native. */
  maxWebFontSize?: number
  /**
   * Rendered inline after the text (e.g. a Unitag badge). Also mounted in the
   * hidden measuring row, so the fit width already excludes its footprint.
   */
  floatingSuffix?: ReactNode
}

export type DynamicSizeTextProps = TextCompatProps & DynamicSizeTextFitOptions

/** Legacy web fit bounds (`DynamicSizeText.web.tsx`). */
export const DEFAULT_MIN_WEB_FONT_SIZE = 8
export const DEFAULT_MAX_WEB_FONT_SIZE = 16
