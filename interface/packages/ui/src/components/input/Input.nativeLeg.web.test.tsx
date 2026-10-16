/**
 * Native-leg contract tests. SCOPE HONESTY: packages/ui has no native-runtime test lane —
 * this suite runs in jsdom with react-native aliased to react-native-web, so RNW's TextInput
 * stands in for the RN one. What it DOES pin is everything ./Input.native.tsx itself owns:
 * the prop surface handed to the TextInput (style resolution, token colors, editable/testID
 * mapping, web-only key stripping) and the focus/blur visual-state wiring. On-device
 * rendering is covered by the PR's executed Pixel 8a before/after diff.
 */
import { fireEvent, render } from '@testing-library/react'
import { Input as NativeLegInput } from 'ui/src/components/input/Input.native'
import { colorsLight } from 'ui/src/theme'
import { describe, expect, it, vi } from 'vitest'

function rgbChannels(value: string): string {
  const hex = /^#([0-9a-fA-F]{6})$/.exec(value.trim())
  if (hex?.[1] !== undefined) {
    const r = Number.parseInt(hex[1].slice(0, 2), 16)
    const g = Number.parseInt(hex[1].slice(2, 4), 16)
    const b = Number.parseInt(hex[1].slice(4, 6), 16)
    return `${r},${g},${b}`
  }
  const match = /^rgba?\(([^)]+)\)$/.exec(value.trim())
  if (!match?.[1]) {
    return value.trim()
  }
  return match[1]
    .split(',')
    .slice(0, 3)
    .map((part) => Number.parseFloat(part.trim()))
    .join(',')
}

describe('Input native leg (RNW TextInput as the RN double)', () => {
  it('renders the default legacy frame through the RN TextInput style prop', () => {
    const { getByTestId } = render(<NativeLegInput testID="native-frame" />)
    const el = getByTestId('native-frame') as HTMLElement

    // size-$true cascade: fontSize 16, borderWidth 1, paddingHorizontal 8, $surface1 background.
    expect(el.style.fontSize).toBe('16px')
    expect(el.style.borderTopWidth).toBe('1px')
    expect(el.style.paddingLeft).toBe('8px')
    expect(el.style.paddingRight).toBe('8px')
    expect(rgbChannels(el.style.backgroundColor)).toBe(rgbChannels(colorsLight.surface1))
  })

  it('resolves token-valued style props and placeholderTextColor before they reach TextInput', () => {
    const { getByTestId } = render(
      <NativeLegInput backgroundColor="$surface3" placeholderTextColor="$neutral2" testID="native-tokens" />,
    )
    const el = getByTestId('native-tokens') as HTMLElement

    expect(rgbChannels(el.style.backgroundColor)).toBe(rgbChannels(colorsLight.surface3))
    // RNW maps placeholderTextColor to its ::placeholder delivery; the resolved concrete
    // value must have arrived (a raw '$neutral2' would be an invalid color and dropped).
    expect(el.outerHTML).not.toContain('$neutral2')
  })

  it('maps disabled/editable to the TextInput editable contract', () => {
    const { getByTestId } = render(<NativeLegInput disabled testID="native-disabled" />)
    const el = getByTestId('native-disabled') as HTMLInputElement
    expect(el.readOnly).toBe(true)

    const { getByTestId: get2 } = render(<NativeLegInput editable={false} testID="native-uneditable" />)
    expect((get2('native-uneditable') as HTMLInputElement).readOnly).toBe(true)
  })

  it('applies focusStyle on focus and reverts on blur, chaining consumer handlers', () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    const { getByTestId } = render(
      <NativeLegInput
        focusStyle={{ backgroundColor: '$surface2' }}
        testID="native-focus"
        onBlur={onBlur}
        onFocus={onFocus}
      />,
    )
    const el = getByTestId('native-focus') as HTMLElement

    fireEvent.focus(el)
    expect(rgbChannels(el.style.backgroundColor)).toBe(rgbChannels(colorsLight.surface2))
    expect(onFocus).toHaveBeenCalledTimes(1)

    fireEvent.blur(el)
    expect(rgbChannels(el.style.backgroundColor)).toBe(rgbChannels(colorsLight.surface1))
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  it('delivers text through onChangeText and strips the web-only rows prop', () => {
    const onChangeText = vi.fn()
    const { getByTestId } = render(<NativeLegInput rows={4} testID="native-change" onChangeText={onChangeText} />)
    const el = getByTestId('native-change') as HTMLInputElement

    fireEvent.change(el, { target: { value: 'typed on native' } })
    expect(onChangeText).toHaveBeenCalledWith('typed on native')
    // `rows` is the web leg's textarea affordance — it must not reach the TextInput
    // (RNW's own single-line TextInput sets rows="1" itself; ours must not override it).
    expect(el.getAttribute('rows')).not.toBe('4')
  })
})
