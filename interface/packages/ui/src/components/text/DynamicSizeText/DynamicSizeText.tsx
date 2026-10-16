import type { TextProps } from '@universe/mycelium'
import React from 'react'
import { PlatformSplitStubError } from 'utilities/src/errors'

type FontSizeOptions = {
  minWebFontSize?: number
  maxWebFontSize?: number
  floatingSuffix?: React.ReactNode
}

export type DynamicSizeTextProps = TextProps & FontSizeOptions

export function DynamicSizeText(_: DynamicSizeTextProps): JSX.Element {
  throw new PlatformSplitStubError('DynamicSizeText')
}
