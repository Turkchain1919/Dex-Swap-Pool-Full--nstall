import { PlatformSplitStubError } from '@universe/environment'
import type { JSX } from 'react'
import type { SvgImageProps } from '../types'

export function SvgImage(_props: SvgImageProps): JSX.Element | null {
  throw new PlatformSplitStubError('SvgImage')
}
