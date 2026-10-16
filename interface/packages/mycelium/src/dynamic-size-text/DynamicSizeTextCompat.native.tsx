import type { JSX } from 'react'
import { FlexCompat } from '../flex-compat/FlexCompat'
import { TextCompat } from '../text-compat/TextCompat'
import type { DynamicSizeTextProps } from './props'

/**
 * Native `DynamicSizeText`: RN's own `adjustsFontSizeToFit` does the fitting,
 * exactly like the legacy `ui/src` `DynamicSizeText.native.tsx` — the web
 * binary-search fit options are inert here.
 */
export function DynamicSizeTextCompat({
  children,
  floatingSuffix,
  gap,
  // Web-only fit bounds — pulled out so they never spread onto the RN Text.
  minWebFontSize: _minWebFontSize,
  maxWebFontSize: _maxWebFontSize,
  ...props
}: DynamicSizeTextProps): JSX.Element {
  return (
    <FlexCompat row gap={gap} overflow="hidden" flexGrow={0} width="100%">
      <TextCompat {...props} adjustsFontSizeToFit>
        {children}
      </TextCompat>
      {floatingSuffix}
    </FlexCompat>
  )
}
