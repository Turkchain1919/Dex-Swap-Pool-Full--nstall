import { PlatformSplitStubError } from '@universe/environment'
import type { JSX } from 'react'
import type { RequireImageProps } from '../types'

export function RequireImage(_props: RequireImageProps): JSX.Element {
  throw new PlatformSplitStubError('RequireImage')
}
