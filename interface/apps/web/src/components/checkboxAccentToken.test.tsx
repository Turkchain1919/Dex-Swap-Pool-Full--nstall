import { fireEvent, screen } from '@testing-library/react'
import { Checkbox } from 'ui/src'
import { getOwnStyleProp } from '~/test-utils/getOwnStyleProp'
import { render } from '~/test-utils/render'

/**
 * Pins the `default` variant's accent as a TOKEN, never a resolved colour: the values live in
 * the token package, and asserting them here would make this a second place to maintain them.
 * `$accent3` is on the rejected side of mycelium's colour boundary, where the Flex lane emits
 * no colour at all, so a regression to it renders an unpainted checkbox rather than a wrong one.
 */
describe('default Checkbox accent token', () => {
  it('paints the checked border with the neutral1 token', () => {
    render(<Checkbox checked variant="default" />)

    expect(getOwnStyleProp(screen.getByRole('checkbox'), 'borderColor')).toBe('$neutral1')
  })

  it('swaps to the hovered twin while hovered', () => {
    render(<Checkbox checked variant="default" />)
    const box = screen.getByRole('checkbox')

    // React synthesizes mouseenter from mouseover.
    fireEvent.mouseOver(box)

    expect(getOwnStyleProp(box, 'borderColor')).toBe('$neutral1Hovered')
  })

  it('leaves the branded variant on its own accent', () => {
    render(<Checkbox checked variant="branded" />)

    expect(getOwnStyleProp(screen.getByRole('checkbox'), 'borderColor')).toBe('$accent1')
  })
})
