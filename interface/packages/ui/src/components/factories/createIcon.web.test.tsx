/**
 * Export-surface and behavior pins for the Tamagui-free createIcon rebuild (INFRA-3314).
 *
 * Renders through the mocked react-native-svg (plain DOM elements) under the shared
 * TamaguiProvider (dark theme) and asserts the resolved inline-style channel: sizes to concrete
 * px, color tokens to concrete theme values, hoverColor/group-hover behaviors.
 *
 * Web-lane only (`*.web.test.tsx`): packages/ui has no native vitest runtime — RN is aliased to
 * react-native-web here.
 */
import { fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { Path, Svg } from 'react-native-svg'
import * as createIconModule from 'ui/src/components/factories/createIcon'
import { createIcon, type IconProps } from 'ui/src/components/factories/createIcon'
import { toDomElement, useGroupHover, type GroupName } from 'ui/src/components/factories/iconHooks'
import { ICON_SIZE_TOKEN_PX } from 'ui/src/components/factories/iconTokens'
import { SharedUIUniswapProvider } from 'ui/src/test/render'
import { colorsDark } from 'ui/src/theme/color/colors'
import { describe, expect, it } from 'vitest'

function makeIcon(): readonly [createIconModule.GeneratedIcon, createIconModule.GeneratedIcon] {
  return createIcon({
    name: 'TestIcon',
    getIcon: (props) => (
      <Svg viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M0 0 L10 10" fill="currentColor" />
      </Svg>
    ),
  })
}

/** jsdom normalizes inline-style colors (hex → rgb) — round-trip expected values through the same CSSOM. */
function cssColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

/**
 * The mocked react-native-svg renders `Svg` as a div that keeps the `viewBox` attribute, and
 * TamaguiProvider (disableSSR) wraps everything in a `display: contents` span — so locate the
 * icon root by attribute instead of by position.
 */
function findSvg(container: HTMLElement): HTMLElement {
  const svg = container.querySelector('[viewbox]')
  if (!(svg instanceof HTMLElement)) {
    throw new Error('expected the icon to render a DOM element')
  }
  return svg
}

function renderIcon(element: JSX.Element): HTMLElement {
  const { container } = render(element, { wrapper: SharedUIUniswapProvider })
  return findSvg(container)
}

describe('createIcon export surface', () => {
  it('exports exactly the factory function at runtime', () => {
    expect(Object.keys(createIconModule).sort()).toEqual(['createIcon'])
  })

  it('returns [Icon, AnimatedIcon] with the legacy display names', () => {
    const [Icon, AnimatedIcon] = makeIcon()
    expect(Icon.displayName).toBe('TestIcon')
    expect(AnimatedIcon.displayName).toBe('AnimatedTestIcon')
  })

  it('keeps the icon size token table pinned to the theme scale', () => {
    expect(ICON_SIZE_TOKEN_PX['$icon.8']).toBe(8)
    expect(ICON_SIZE_TOKEN_PX['$icon.24']).toBe(24)
    expect(ICON_SIZE_TOKEN_PX['$icon.true']).toBe(40)
  })
})

describe('createIcon resolved style channel', () => {
  it('defaults to $icon.8 with strokeWidth 8 and currentColor on web', () => {
    const [Icon] = makeIcon()
    const svg = renderIcon(<Icon />)
    expect(svg.style.width).toBe('8px')
    expect(svg.style.height).toBe('8px')
    expect(svg.style.color.toLowerCase()).toBe('currentcolor')
    expect(svg.getAttribute('strokeWidth') ?? svg.getAttribute('stroke-width')).toBe('8')
  })

  it('resolves $icon size tokens and numeric sizes to concrete px in inline style', () => {
    const [Icon] = makeIcon()
    expect(renderIcon(<Icon size="$icon.24" />).style.width).toBe('24px')
    expect(renderIcon(<Icon size={20} />).style.height).toBe('20px')
    expect(renderIcon(<Icon size={{ width: 10, height: 12 }} />).style.width).toBe('10px')
  })

  it('resolves color tokens to concrete theme values (dark theme provider)', () => {
    const [Icon] = makeIcon()
    const svg = renderIcon(<Icon color="$statusSuccess" />)
    expect(svg.style.color).toBe(cssColor(colorsDark.statusSuccess))
  })

  it('passes raw colors through and maps testID to data-testid on the web target', () => {
    const [Icon] = makeIcon()
    const svg = renderIcon(<Icon color="#ff0000" testID="raw-color" />)
    expect(svg.style.color).toBe('rgb(255, 0, 0)')
    expect(svg.getAttribute('data-testid')).toBe('raw-color')
    expect(svg.hasAttribute('testID') || svg.hasAttribute('testid')).toBe(false)
  })

  it('keeps the old style declaration order: width, height, others, color, transform', () => {
    const [Icon] = makeIcon()
    const svg = renderIcon(<Icon size={16} color="#111111" ml="$spacing4" rotate="90deg" />)
    expect(svg.style.cssText).toBe(
      'width: 16px; height: 16px; margin-left: 4px; color: rgb(17, 17, 17); transform: rotate(90deg);',
    )
  })

  it('hoverStyle synthesizes the off-state base and applies on the element hover', () => {
    const [Icon] = makeIcon()
    const svg = renderIcon(<Icon hoverStyle={{ opacity: 0.5 }} transition="opacity 0.08s ease-in-out" />)
    expect(svg.style.opacity).toBe('1')
    expect(svg.style.transition).toBe('opacity 0.08s ease-in-out')
    fireEvent.mouseEnter(svg)
    expect(svg.style.opacity).toBe('0.5')
    fireEvent.mouseLeave(svg)
    expect(svg.style.opacity).toBe('1')
  })

  it('lets untyped width/height beat the size on their axis, and the style prop beat everything', () => {
    const [Icon] = makeIcon()
    const props = { width: 30 } as Partial<IconProps>
    const svg = renderIcon(<Icon size={20} {...props} />)
    expect(svg.style.width).toBe('30px')
    expect(svg.style.height).toBe('20px')
    const styled = renderIcon(<Icon size={20} style={{ width: 33 }} />)
    expect(styled.style.width).toBe('33px')
  })

  it('flattens RN-style array style props (nested arrays and falsy entries) on every dialect', () => {
    const [Icon] = makeIcon()
    const svg = renderIcon(
      <Icon size={20} style={[{ width: 33 }, null, [{ opacity: 0.5 }, false]] as IconProps['style']} />,
    )
    expect(svg.style.width).toBe('33px')
    expect(svg.style.opacity).toBe('0.5')
    expect(svg.getAttribute('style')).not.toContain('0:')
  })

  it('resolves space-token style props (shorthands expanded) into inline style', () => {
    const [Icon] = makeIcon()
    const svg = renderIcon(<Icon ml="$spacing4" flexShrink={0} />)
    expect(svg.style.marginLeft).toBe('4px')
    expect(svg.style.flexShrink).toBe('0')
    const padded = renderIcon(<Icon px="$spacing8" />)
    expect(padded.style.paddingLeft).toBe('8px')
    expect(padded.style.paddingRight).toBe('8px')
  })

  it('builds a CSS transform from rotate props on web', () => {
    const [Icon] = makeIcon()
    const svg = renderIcon(<Icon rotate="180deg" />)
    expect(svg.style.transform).toBe('rotate(180deg)')
  })

  it('a string transform clobbers individual transform props, like the old resolver on every dialect', () => {
    const [Icon] = makeIcon()
    const svg = renderIcon(<Icon transform="rotate(180deg)" rotateZ="90deg" scale={1.2} />)
    expect(svg.style.transform).toBe('rotate(180deg)')
  })

  it('resolves width/height override tokens like any size-category style prop', () => {
    const [Icon] = makeIcon()
    // $xxxl (max-width 1536) matches jsdom's 1024px window, so its width override applies
    const svg = renderIcon(<Icon size={16} $xxxl={{ width: '$spacing24' }} />)
    expect(svg.style.width).toBe('24px')
    expect(svg.style.height).toBe('16px')
  })

  it('forwards the rendered DOM element to refs on the web style target', () => {
    const [Icon] = makeIcon()
    let received: unknown = null
    render(
      <Icon
        ref={(instance) => {
          received = instance
        }}
      />,
      { wrapper: SharedUIUniswapProvider },
    )
    expect(received).toBeInstanceOf(Element)
  })

  it('toDomElement unwraps react-native-svg web instances via elementRef', () => {
    const el = document.createElement('svg')
    expect(toDomElement({ elementRef: { current: el } })).toBe(el)
    expect(toDomElement(el)).toBe(el)
    expect(toDomElement({ elementRef: { current: null } })).toBeNull()
    expect(toDomElement({})).toBeNull()
    expect(toDomElement(null)).toBeNull()
  })
})

describe('createIcon hover behaviors', () => {
  it('hoverColor renders the web hover wrapper and swaps the color on hover', () => {
    const [Icon] = makeIcon()
    const { container } = render(<Icon color="#111111" hoverColor="#222222" />, {
      wrapper: SharedUIUniswapProvider,
    })
    const svg = findSvg(container)
    const wrapper = svg.parentElement as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.style.display).toBe('flex')
    expect(svg.style.color).toBe('rgb(17, 17, 17)')
    fireEvent.mouseEnter(wrapper)
    expect(findSvg(container).style.color).toBe('rgb(34, 34, 34)')
    fireEvent.mouseLeave(wrapper)
    expect(findSvg(container).style.color).toBe('rgb(17, 17, 17)')
  })

  it('$group-item-hover applies when the nearest t_group_item ancestor is hovered', () => {
    const [Icon] = makeIcon()
    const { container } = render(
      <div className="t_group_item" data-testid="group">
        <Icon color="#111111" $group-item-hover={{ color: '#333333' }} />
      </div>,
      { wrapper: SharedUIUniswapProvider },
    )
    const group = container.querySelector('.t_group_item') as HTMLElement
    expect(findSvg(container).style.color).toBe('rgb(17, 17, 17)')
    fireEvent.mouseEnter(group)
    expect(findSvg(container).style.color).toBe('rgb(51, 51, 51)')
    fireEvent.mouseLeave(group)
    expect(findSvg(container).style.color).toBe('rgb(17, 17, 17)')
  })

  it('$group-hover binds the t_group_true ancestor only, like Tamagui rewriting $group- to $group-true- (TouchableArea injection path)', () => {
    const [Icon] = makeIcon()
    const { container } = render(
      <div className="t_group_true">
        <div className="t_group_item" data-testid="inner">
          <Icon color="#111111" $group-hover={{ color: '$statusCritical' }} />
        </div>
      </div>,
      { wrapper: SharedUIUniswapProvider },
    )
    const inner = container.querySelector('.t_group_item') as HTMLElement
    fireEvent.mouseEnter(inner)
    expect(findSvg(container).style.color).toBe('rgb(17, 17, 17)')
    const outer = container.querySelector('.t_group_true') as HTMLElement
    fireEvent.mouseEnter(outer)
    expect(findSvg(container).style.color).toBe(cssColor(colorsDark.statusCritical))
  })
})

/**
 * Exercises the hook directly (no group style props — adding those is banned repo-wide) to pin
 * the anchor matching itself; the createIcon wiring is pinned by the grandfathered tests above.
 */
function GroupHoverProbe(props: { any?: boolean; item?: boolean; card?: boolean }): JSX.Element {
  const domNodeRef = useRef<HTMLSpanElement>(null)
  const hovered = useGroupHover({
    domNodeRef,
    hasAnyGroupStyle: props.any ?? false,
    hasItemGroupStyle: props.item ?? false,
    hasCardGroupStyle: props.card ?? false,
  })
  return <span data-hovered={JSON.stringify(hovered)} data-testid="probe" ref={domNodeRef} />
}

function readHovered(container: HTMLElement): Record<GroupName, boolean> {
  const probe = container.querySelector('[data-testid="probe"]')
  return JSON.parse(probe?.getAttribute('data-hovered') ?? '{}') as Record<GroupName, boolean>
}

describe('useGroupHover anchor matching across marker systems (INFRA-3672)', () => {
  it('binds a Tamagui t_group_true ancestor for the unnamed group', () => {
    const { container } = render(
      <div className="t_group_true" data-testid="anchor">
        <GroupHoverProbe any />
      </div>,
    )
    const anchor = container.querySelector('[data-testid="anchor"]') as HTMLElement
    expect(readHovered(container).any).toBe(false)
    fireEvent.mouseEnter(anchor)
    expect(readHovered(container).any).toBe(true)
    fireEvent.mouseLeave(anchor)
    expect(readHovered(container).any).toBe(false)
  })

  it('binds a mycelium `group` ancestor for the unnamed group (converted anchor)', () => {
    const { container } = render(
      <div className="group" data-testid="anchor">
        <GroupHoverProbe any />
      </div>,
    )
    const anchor = container.querySelector('[data-testid="anchor"]') as HTMLElement
    expect(readHovered(container).any).toBe(false)
    fireEvent.mouseEnter(anchor)
    expect(readHovered(container).any).toBe(true)
    fireEvent.mouseLeave(anchor)
    expect(readHovered(container).any).toBe(false)
  })

  it('binds a mycelium `group/item` ancestor for the item group (escaped-slash selector)', () => {
    const { container } = render(
      <div className="group/item" data-testid="anchor">
        <GroupHoverProbe item />
      </div>,
    )
    const anchor = container.querySelector('[data-testid="anchor"]') as HTMLElement
    expect(readHovered(container).item).toBe(false)
    fireEvent.mouseEnter(anchor)
    expect(readHovered(container).item).toBe(true)
    fireEvent.mouseLeave(anchor)
    expect(readHovered(container).item).toBe(false)
  })

  it('binds a mycelium `group/card` ancestor for the card group', () => {
    const { container } = render(
      <div className="group/card" data-testid="anchor">
        <GroupHoverProbe card />
      </div>,
    )
    const anchor = container.querySelector('[data-testid="anchor"]') as HTMLElement
    fireEvent.mouseEnter(anchor)
    expect(readHovered(container).card).toBe(true)
    fireEvent.mouseLeave(anchor)
    expect(readHovered(container).card).toBe(false)
  })

  it('a named `group/item` anchor never binds the unnamed group — mycelium named anchors emit only `group/<name>` (groupMarkerClasses), and class matching is whole-token', () => {
    const { container } = render(
      <div className="group/item" data-testid="anchor">
        <GroupHoverProbe any item />
      </div>,
    )
    const anchor = container.querySelector('[data-testid="anchor"]') as HTMLElement
    fireEvent.mouseEnter(anchor)
    expect(readHovered(container)).toEqual({ any: false, item: true, card: false })
  })

  it('stays inert without an anchor of either system: no crash, hover never fires', () => {
    const { container } = render(
      <div data-testid="plain">
        <GroupHoverProbe any card item />
      </div>,
    )
    const plain = container.querySelector('[data-testid="plain"]') as HTMLElement
    fireEvent.mouseEnter(plain)
    expect(readHovered(container)).toEqual({ any: false, item: false, card: false })
  })
})
