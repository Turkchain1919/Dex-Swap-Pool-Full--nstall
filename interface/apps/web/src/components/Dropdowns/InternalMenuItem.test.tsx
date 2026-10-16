import { InternalMenuItem } from '~/components/Dropdowns/Dropdown'
import { render } from '~/test-utils/render'

// Pins the e2e selector contract: dropdown option rows must expose data-testid
// in the DOM whichever spelling the caller uses (TokenExplore/Activity e2e
// select these rows by test id).
describe(InternalMenuItem, () => {
  it('renders testID as a data-testid attribute', () => {
    const { container } = render(<InternalMenuItem testID="menu-item-canonical">label</InternalMenuItem>)
    expect(container.querySelector('[data-testid="menu-item-canonical"]')).not.toBeNull()
  })

  it('forwards a literal data-testid attribute', () => {
    const { container } = render(<InternalMenuItem data-testid="menu-item-literal">label</InternalMenuItem>)
    expect(container.querySelector('[data-testid="menu-item-literal"]')).not.toBeNull()
  })
})
