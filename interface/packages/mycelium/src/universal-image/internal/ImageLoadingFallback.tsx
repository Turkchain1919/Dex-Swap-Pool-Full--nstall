import type { JSX } from 'react'
import { FlexLoaderCompat } from '../../flex-loader-compat/FlexLoaderCompat'
import { Shimmer } from '../../shimmer/Shimmer'

/** The image loading placeholder: a shimmering square block. */
export function ImageLoadingFallback(): JSX.Element {
  return (
    <Shimmer>
      {/* literal 0, not $none: the $none radius token resolves to a CSS var on web instead of 0 */}
      <FlexLoaderCompat aspectRatio={1} borderRadius={0} />
    </Shimmer>
  )
}
