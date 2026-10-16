import { PlatformSplitStubError } from '@universe/environment'
import type { JSX } from 'react'
import type { PlainImageProps } from '../types'

export function PlainImage(_props: PlainImageProps): JSX.Element {
  throw new PlatformSplitStubError('PlainImage')
}
