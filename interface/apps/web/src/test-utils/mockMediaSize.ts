import { type MediaState, useMedia } from '@universe/mycelium/theme-hooks-compat'
import { mocked } from '~/test-utils/mocked'

type MediaQueryState = { -readonly [K in keyof MediaState]: boolean }

function getMediaState(size: keyof MediaQueryState) {
  const mediaState: MediaQueryState = {
    xxs: false,
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    xxl: false,
    xxxl: false,
    short: false,
    midHeight: false,
    lgHeight: false,
  }
  const mediaStateKeys = Object.keys(mediaState)
  mediaStateKeys.forEach((key, i) => {
    const index = mediaStateKeys.indexOf(size)
    if (i >= index && key !== 'short' && key !== 'midHeight' && key !== 'lgHeight') {
      mediaState[key as keyof MediaQueryState] = true
    }
  })
  return mediaState
}

/**
 * Sets the viewport the mocked mycelium `useMedia` reports. The test file must
 * `vi.mock('@universe/mycelium/theme-hooks-compat')`; the legacy `ui/src` hook is gone.
 */
export function mockMediaSize(size: keyof MediaQueryState) {
  if (!vi.isMockFunction(useMedia)) {
    throw new Error(
      "mockMediaSize: no useMedia mock found: vi.mock('@universe/mycelium/theme-hooks-compat') must be set up in the test file",
    )
  }
  mocked(useMedia).mockReturnValue(getMediaState(size))
}
