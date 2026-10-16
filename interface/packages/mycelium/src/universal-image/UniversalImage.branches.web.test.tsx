import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UniversalImage } from './UniversalImage'

const SVG_URI = 'https://example.com/image.svg'
const PNG_URI = 'https://example.com/image.png'

/**
 * WEB branch selection for `UniversalImage`: which leaf each uri shape renders and
 * the testID prefix the branch stamps on it (`img-`, `svg-`), plus the no-uri
 * fallback. Consumers select these elements by the prefixed testID, so the prefix
 * is part of the component's contract, not an implementation detail.
 *
 * Moved here from `ui/src/components/UniversalImage/UniversalImage.parity.web.test.tsx`
 * (INFRA-3682) when that directory was removed: the component lives in mycelium now,
 * and these three assertions never depended on the Tamagui baseline that suite existed
 * to compare against. The Tamagui-baseline half moved to the tailwind parity package,
 * which is the only place allowed to import `ui/src`.
 *
 * Sibling coverage: `./UniversalImage.nativeSource.web.test.tsx` pins the loading and
 * require-source branches, `./internal/PlainImage.web.test.tsx` the load/error state.
 * No provider is wrapped: the rebuilt component is Tamagui-free.
 */
describe('UniversalImage web branches', () => {
  it('renders the fallback when there is no uri', () => {
    const { getByTestId } = render(
      <UniversalImage fallback={<div data-testid="fallback" />} size={{ width: 20, height: 20 }} />,
    )

    expect(getByTestId('fallback')).toBeDefined()
  })

  it('renders a plain image with the img-prefixed testID', () => {
    const { getByTestId } = render(<UniversalImage size={{ width: 20, height: 20 }} testID="plain" uri={PNG_URI} />)

    const wrapper = getByTestId('img-plain')
    const img = wrapper.querySelector('img')
    expect(img?.getAttribute('src')).toBe(PNG_URI)
  })

  it('renders an svg uri inside the svg-prefixed container', () => {
    const { getByTestId } = render(<UniversalImage size={{ width: 20, height: 20 }} testID="vector" uri={SVG_URI} />)

    const svgContainer = getByTestId('svg-vector')
    const img = svgContainer.querySelector('img')
    expect(img?.getAttribute('src')).toBe(SVG_URI)
  })
})
