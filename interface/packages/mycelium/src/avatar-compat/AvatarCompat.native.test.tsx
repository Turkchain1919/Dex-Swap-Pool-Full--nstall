/**
 * Native-leg render contract for the avatar compat compound, run under jsdom
 * through the `testing/react-native-mock` hosts (the platform-legs suite's
 * mechanism) — pinning the review-caught cross-leg divergence: `Image`'s
 * `className` must land on the INNER image element on both legs, never on the
 * frame wrapper (uniwind puts `className` on RN `Image` via uniwind-env.d.ts).
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => import('./testing/react-native-mock'))

afterEach(cleanup)

describe('native leg: Image className routing', () => {
  it('merges className onto the inner Image, not the frame — the same logical element as the web leg', async () => {
    const { AvatarCompat } = await import('./AvatarCompat.native')
    const { container } = render(
      <AvatarCompat size={32}>
        <AvatarCompat.Image src="https://example.test/flag.svg" className="custom-image-class" testID="image" />
      </AvatarCompat>,
    )
    const marked = container.querySelector('.custom-image-class')
    expect(marked).not.toBeNull()
    // The mock renders RN hosts as elements named after the component.
    expect(marked?.tagName.toLowerCase()).toBe('image')
  })

  it('does not re-fire onLoadingStatusChange when only the callback identity changes', async () => {
    const { AvatarCompat } = await import('./AvatarCompat.native')
    const calls: string[] = []
    const { rerender } = render(
      <AvatarCompat size={32}>
        <AvatarCompat.Image
          src="https://example.test/flag.svg"
          onLoadingStatusChange={(status) => calls.push(status)}
        />
      </AvatarCompat>,
    )
    expect(calls).toEqual(['idle'])
    rerender(
      <AvatarCompat size={32}>
        <AvatarCompat.Image
          src="https://example.test/flag.svg"
          onLoadingStatusChange={(status) => calls.push(`second:${status}`)}
        />
      </AvatarCompat>,
    )
    expect(calls).toEqual(['idle'])
  })
})
