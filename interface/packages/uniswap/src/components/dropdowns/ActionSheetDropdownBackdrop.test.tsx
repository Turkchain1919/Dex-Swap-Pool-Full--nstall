import { Backdrop } from 'uniswap/src/components/dropdowns/ActionSheetDropdownBackdrop'
import { render } from 'uniswap/src/test/test-utils'

function renderedTree(element: JSX.Element): string {
  return JSON.stringify(render(element).toJSON())
}

/**
 * `position` and `animatePresence` exist only for `Presence` to read off the element; its native
 * leg uses them to size the wrapper and to skip the exit hold. Neither may reach the rendered
 * output — if this component ever grows a `{...rest}` spread they would, changing web rendering.
 */
describe('Backdrop', () => {
  it('renders identically with and without the Presence-only props', () => {
    expect(renderedTree(<Backdrop position="absolute" animatePresence={false} />)).toEqual(renderedTree(<Backdrop />))
  })

  it('never forwards those props to the host element', () => {
    const tree = renderedTree(<Backdrop position="absolute" animatePresence={false} />)

    expect(tree).not.toContain('animatePresence')
  })
})
