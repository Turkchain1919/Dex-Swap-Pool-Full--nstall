/**
 * The shared class-lane native display gate. A pool-/variant-scoped `display`
 * compiles to a PREFIXED token (`dark:grid`, `media-md:[display:grid]`, or an
 * unprefixed `grid` via the `$platform-web` base-pool merge) that the old
 * anchored `[display:…]` match never saw — measured reaching Yoga as
 * `display: "grid"` through uniwind's own pipeline before this gate existed.
 */
import { describe, expect, it } from 'vitest'
import { DISPLAY_CLASS } from '../flex-compat/flex-style-classes'
import { droppedNonNativeDisplayProps, isNonNativeDisplayClass, stripNonNativeDisplayClasses } from './native-display'
import { RN_DISPLAY_VALUES } from './native-values'

describe('isNonNativeDisplayClass', () => {
  it('classifies every compiler-emitted display class from the map it is derived from', () => {
    for (const [value, cls] of Object.entries(DISPLAY_CLASS)) {
      expect(isNonNativeDisplayClass(cls), cls).toBe(!RN_DISPLAY_VALUES.has(value))
    }
  })

  it('is variant-prefix independent — the pool carriers the anchored match missed', () => {
    for (const token of ['dark:grid', 'light:inline-grid', 'media-md:block', 'media-md:hover:inline-flex']) {
      expect(isNonNativeDisplayClass(token), token).toBe(true)
    }
    for (const token of ['dark:hidden', 'media-md:flex', 'light:contents']) {
      expect(isNonNativeDisplayClass(token), token).toBe(false)
    }
  })

  it('classifies arbitrary display tokens under any prefix, keeping RN-valid values', () => {
    expect(isNonNativeDisplayClass('dark:[display:grid]')).toBe(true)
    expect(isNonNativeDisplayClass('media-md:[display:-webkit-box]')).toBe(true)
    expect(isNonNativeDisplayClass('[display:inherit]')).toBe(true)
    expect(isNonNativeDisplayClass('dark:[display:none]')).toBe(false)
  })

  it('never classifies a non-display utility, colon-bearing arbitrary values included', () => {
    for (const token of ['flex-row', 'grid-cols-2', 'bg-surface1', '[box-shadow:0_1px_2px_red]', 'w-[100px]']) {
      expect(isNonNativeDisplayClass(token), token).toBe(false)
    }
  })
})

describe('stripNonNativeDisplayClasses', () => {
  it('drops non-RN display tokens under every prefix and keeps everything else in order', () => {
    expect(stripNonNativeDisplayClasses('flex grid m-0 dark:grid media-md:[display:grid] media-md:hidden')).toBe(
      'flex m-0 media-md:hidden',
    )
  })

  it('keeps the TextCompat contract: [display:…] tokens strip exactly as before', () => {
    expect(stripNonNativeDisplayClasses('[display:inline] m-0 [display:-webkit-box] [display:inline-flex]')).toBe('m-0')
    expect(stripNonNativeDisplayClasses('[display:flex] [display:none] [display:contents]')).toBe(
      '[display:flex] [display:none] [display:contents]',
    )
  })
})

describe('droppedNonNativeDisplayProps', () => {
  it('names the top-level prop and each pool carrying a non-RN display', () => {
    expect(
      droppedNonNativeDisplayProps({
        display: 'grid',
        $md: { display: 'inline-grid' },
        '$platform-web': { display: 'inline-flex' },
        '$theme-dark': { display: 'block' },
        '$group-hover': { display: 'inline' },
      }),
    ).toEqual(['display', '$md.display', '$platform-web.display', '$theme-dark.display', '$group-hover.display'])
  })

  it('sees the $platform-web override nested inside a media pool (poolChunks compiles it)', () => {
    expect(droppedNonNativeDisplayProps({ $md: { '$platform-web': { display: 'grid' } } })).toEqual([
      '$md.$platform-web.display',
    ])
  })

  it('names the pseudo-state pools — top-level and nested inside media/$platform-web pools alike', () => {
    expect(
      droppedNonNativeDisplayProps({
        hoverStyle: { display: 'grid' },
        pressStyle: { display: 'inline-flex' },
        $md: { hoverStyle: { display: 'block' } },
        '$platform-web': { focusStyle: { display: 'inline' } },
        $lg: { '$platform-web': { disabledStyle: { display: 'inline-grid' } } },
      }),
    ).toEqual([
      'hoverStyle.display',
      'pressStyle.display',
      '$md.hoverStyle.display',
      '$platform-web.focusStyle.display',
      '$lg.$platform-web.disabledStyle.display',
    ])
  })

  it('stays silent for RN-valid pseudo-pool display values', () => {
    expect(
      droppedNonNativeDisplayProps({
        hoverStyle: { display: 'none' },
        $md: { pressStyle: { display: 'flex' } },
      }),
    ).toEqual([])
  })

  it('stays silent for RN-valid display values and display-free pools', () => {
    expect(
      droppedNonNativeDisplayProps({
        display: 'flex',
        $md: { display: 'none' },
        '$theme-dark': { backgroundColor: '$surface2' },
        '$platform-web': undefined,
      }),
    ).toEqual([])
  })
})
