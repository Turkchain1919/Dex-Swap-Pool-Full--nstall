/**
 * Behavior contract for the `Anchor` compat web leg (INFRA-3549), asserted on
 * the rendered DOM. The legacy reference is tamagui's `Anchor`
 * (`styled(SizableText, { tag: 'a', accessibilityRole: 'link' })` +
 * `href`/`target`/`rel`), re-exported raw from the `ui/src` barrel.
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AnchorCompat } from './AnchorCompat'

afterEach(() => {
  cleanup()
})

function anchorOf(container: HTMLElement): HTMLAnchorElement {
  const anchor = container.querySelector('a')
  if (anchor === null) {
    throw new Error('no anchor rendered')
  }
  return anchor
}

describe('anchor semantics (the legacy web render)', () => {
  it('renders an <a href target rel role="link"> carrying the children', () => {
    const { container } = render(
      <AnchorCompat href="https://uniswap.org" target="_blank" rel="noopener noreferrer">
        Learn more
      </AnchorCompat>,
    )
    const anchor = anchorOf(container)
    expect(anchor.getAttribute('href')).toBe('https://uniswap.org')
    expect(anchor.getAttribute('target')).toBe('_blank')
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer')
    expect(anchor.getAttribute('role')).toBe('link')
    expect(anchor.textContent).toBe('Learn more')
  })

  it('renders an anchor even without an href (legacy href is optional)', () => {
    const { container } = render(<AnchorCompat>Learn more</AnchorCompat>)
    expect(anchorOf(container).hasAttribute('href')).toBe(false)
  })

  it('a caller-supplied tag wins over the anchor default, like the legacy styled default', () => {
    const { container } = render(<AnchorCompat tag="span">Learn more</AnchorCompat>)
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('span')?.textContent).toBe('Learn more')
  })

  it('a caller-supplied role wins over the link default', () => {
    const { container } = render(
      <AnchorCompat href="https://uniswap.org" role="button">
        Learn more
      </AnchorCompat>,
    )
    expect(anchorOf(container).getAttribute('role')).toBe('button')
  })

  it('carries the inline base color that outranks the unlayered global a { color } (TextCompat anchor path)', () => {
    // Serialized markup, not CSSOM: jsdom drops var()-valued declarations
    // (the TextCompat.web.test.tsx precedent).
    const markup = renderToStaticMarkup(<AnchorCompat href="https://uniswap.org">Learn more</AnchorCompat>)
    expect(markup).toContain('style="color:var(--stext-neutral1)"')
  })

  it('forwards the ref to the anchor element', () => {
    const ref = React.createRef<HTMLElement>()
    const { container } = render(
      <AnchorCompat ref={ref} href="https://uniswap.org">
        Learn more
      </AnchorCompat>,
    )
    expect(ref.current).toBe(anchorOf(container))
  })
})

describe('press dispatch (navigation itself is the anchor default, untouched)', () => {
  it('onPress fires on click', () => {
    const onPress = vi.fn()
    const { container } = render(
      <AnchorCompat href="https://uniswap.org" onPress={onPress}>
        Learn more
      </AnchorCompat>,
    )
    fireEvent.click(anchorOf(container))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe('text style props ride the TextCompat surface', () => {
  it('accepts the audited call-site props without dropping the anchor identity', () => {
    const { container } = render(
      <AnchorCompat
        href="https://uniswap.org"
        target="_blank"
        textDecorationLine="none"
        color="$accent1"
        fontSize={14}
        lineHeight={16}
        display="flex"
        flexDirection="row"
        gap="$spacing4"
        aria-label="learn more"
        testID="anchor-compat-probe"
      >
        Learn more
      </AnchorCompat>,
    )
    const anchor = anchorOf(container)
    expect(anchor.getAttribute('aria-label')).toBe('learn more')
    expect(anchor.getAttribute('data-testid')).toBe('anchor-compat-probe')
  })
})
