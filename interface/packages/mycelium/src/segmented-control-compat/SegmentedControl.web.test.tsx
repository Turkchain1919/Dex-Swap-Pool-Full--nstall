import { fireEvent, render, screen } from '@testing-library/react'
import { SPORE_ANIMATION_CURVE_CSS } from '@universe/tailwind/animations'
import { useState, type JSX } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { VARIANT_METRICS } from '../text-compat/tokens'
import { SegmentedControl } from './SegmentedControl.web'
import { LABEL_CLASSES_LARGE, LABEL_CLASSES_SMALL } from './style-classes'
import type { SegmentedControlProps } from './types'

const OPTIONS = [{ value: 'one' }, { value: 'two' }, { value: 'three' }] as const

function renderControl(overrides: Partial<SegmentedControlProps> = {}): ReturnType<typeof render> {
  return render(
    <SegmentedControl options={OPTIONS} selectedOption="one" onSelectOption={() => undefined} {...overrides} />,
  )
}

function getOption(value: string): HTMLElement {
  const node = screen.getByText(value).closest('button, a')
  if (!(node instanceof HTMLElement)) {
    throw new Error(`option ${value} did not render as a button or anchor`)
  }
  return node
}

function getIndicator(): HTMLElement {
  return screen.getByTestId('segmented-control-indicator')
}

describe('SegmentedControl (web)', () => {
  it('renders each option as a <button type="button" role="button"> inside the tablist', () => {
    renderControl()
    const tablist = screen.getByRole('tablist')
    expect(tablist.getAttribute('aria-orientation')).toBe('horizontal')
    for (const { value } of OPTIONS) {
      const option = getOption(value)
      expect(option.tagName).toBe('BUTTON')
      expect(option.getAttribute('type')).toBe('button')
      expect(option.getAttribute('role')).toBe('button')
      expect(option.tabIndex).toBe(0)
    }
    expect(getOption('one').getAttribute('aria-selected')).toBe('true')
    expect(getOption('two').getAttribute('aria-selected')).toBe('false')
  })

  it('resets the UA border on every option', () => {
    renderControl()
    for (const { value } of OPTIONS) {
      expect(getOption(value).className).toContain('border-0')
    }
  })

  it('throws the legacy 2-6 options assertion', () => {
    // The component throws during render — silence React's error logging.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      render(<SegmentedControl options={[{ value: 'only' }]} selectedOption="only" onSelectOption={() => undefined} />),
    ).toThrow('Segmented control must have between 2 and 6 options, inclusive.')
    spy.mockRestore()
  })

  it('selects on click, including re-selecting the already-selected value', () => {
    const onSelectOption = vi.fn()
    renderControl({ onSelectOption })
    fireEvent.click(getOption('two'))
    expect(onSelectOption).toHaveBeenCalledTimes(1)
    expect(onSelectOption).toHaveBeenCalledWith('two')
    fireEvent.click(getOption('one'))
    expect(onSelectOption).toHaveBeenLastCalledWith('one')
  })

  it('never selects a disabled option or any option of a disabled control', () => {
    const onSelectOption = vi.fn()
    const { unmount } = renderControl({
      onSelectOption,
      options: [{ value: 'one' }, { value: 'two', disabled: true }],
    })
    const disabledOption = getOption('two')
    expect(disabledOption).toHaveProperty('disabled', true)
    expect(disabledOption.getAttribute('aria-disabled')).toBe('true')
    expect(disabledOption.tabIndex).toBe(-1)
    fireEvent.click(disabledOption)
    expect(onSelectOption).not.toHaveBeenCalled()
    unmount()

    renderControl({ onSelectOption, disabled: true })
    fireEvent.click(getOption('two'))
    expect(onSelectOption).not.toHaveBeenCalled()
  })

  it('renders href options as anchors with link semantics and select-not-navigate clicks', () => {
    const onSelectOption = vi.fn()
    renderControl({
      onSelectOption,
      options: [{ value: 'one' }, { value: 'two', href: '/two' }, { value: 'three', href: '/three', disabled: true }],
    })
    const anchor = getOption('two')
    expect(anchor.tagName).toBe('A')
    expect(anchor.getAttribute('href')).toBe('/two')
    expect(anchor.getAttribute('role')).toBe('link')
    expect(anchor.className).toContain('no-underline')

    // Disabled anchor: href dropped, role falls back to button (legacy).
    const disabledAnchor = getOption('three')
    expect(disabledAnchor.getAttribute('href')).toBeNull()
    expect(disabledAnchor.getAttribute('role')).toBe('button')

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    anchor.dispatchEvent(clickEvent)
    expect(clickEvent.defaultPrevented).toBe(true)
    expect(onSelectOption).toHaveBeenCalledTimes(1)
    expect(onSelectOption).toHaveBeenCalledWith('two')
  })

  it('selects exactly once on Enter and Space, through the disabled guard', () => {
    const onSelectOption = vi.fn()
    renderControl({ onSelectOption, options: [{ value: 'one' }, { value: 'two', disabled: true }] })
    fireEvent.keyDown(getOption('one'), { key: 'Enter' })
    expect(onSelectOption).toHaveBeenCalledTimes(1)
    expect(onSelectOption).toHaveBeenCalledWith('one')
    fireEvent.keyDown(getOption('one'), { key: ' ' })
    expect(onSelectOption).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(getOption('two'), { key: 'Enter' })
    expect(onSelectOption).toHaveBeenCalledTimes(2)
  })

  it('moves focus with arrow keys across enabled options without looping (legacy roving focus)', () => {
    renderControl({ options: [{ value: 'one' }, { value: 'two', disabled: true }, { value: 'three' }] })
    const first = getOption('one')
    const last = getOption('three')

    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    // The disabled middle option is skipped.
    expect(document.activeElement).toBe(last)
    // No wrap past the end (legacy loop={false}).
    fireEvent.keyDown(last, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(last)
    fireEvent.keyDown(last, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'End' })
    expect(document.activeElement).toBe(last)
    fireEvent.keyDown(last, { key: 'Home' })
    expect(document.activeElement).toBe(first)
  })

  it('tracks hover per option: text color + onHoverOption, with the disabled guard', () => {
    const onHoverOption = vi.fn()
    renderControl({ onHoverOption, options: [{ value: 'one' }, { value: 'two' }, { value: 'three', disabled: true }] })
    const idle = screen.getByText('two')
    expect(idle.className).toContain('text-neutral2')

    fireEvent.mouseEnter(getOption('two'))
    expect(onHoverOption).toHaveBeenCalledTimes(1)
    expect(onHoverOption).toHaveBeenCalledWith('two')
    expect(screen.getByText('two').className).toContain('text-neutral1')
    fireEvent.mouseLeave(getOption('two'))
    expect(screen.getByText('two').className).toContain('text-neutral2')

    // Disabled options never hover (legacy <button disabled> suppression,
    // reproduced uniformly).
    fireEvent.mouseEnter(getOption('three'))
    expect(onHoverOption).toHaveBeenCalledTimes(1)
    expect(screen.getByText('three').className).toContain('text-neutral3')
  })

  it('pins the label typography to the legacy buttonLabel3/buttonLabel4 web metrics', () => {
    const large = VARIANT_METRICS.buttonLabel3
    const small = VARIANT_METRICS.buttonLabel4
    expect(LABEL_CLASSES_LARGE).toContain(`text-[${large.fontSize}px]`)
    expect(LABEL_CLASSES_LARGE).toContain(`[line-height:${large.lineHeight}px]`)
    expect(LABEL_CLASSES_LARGE).toContain(`[font-weight:${large.fontWeight}]`)
    expect(LABEL_CLASSES_SMALL).toContain(`text-[${small.fontSize}px]`)
    expect(LABEL_CLASSES_SMALL).toContain(`[line-height:${small.lineHeight}px]`)
    expect(LABEL_CLASSES_SMALL).toContain(`[font-weight:${small.fontWeight}]`)
    for (const classes of [LABEL_CLASSES_LARGE, LABEL_CLASSES_SMALL]) {
      expect(classes).toContain('[font-family:var(--stext-font-medium)]')
      expect(classes).toContain('select-none')
    }

    renderControl({ size: 'large' })
    expect(screen.getByText('one').className).toContain('text-[14px]')
    renderControl({ size: 'default' })
    expect(screen.getAllByText('one').at(-1)?.className).toContain('text-[12px]')
  })

  it('renders custom display elements and clones wrappers keyed by value', () => {
    const wrapper = <div data-testid="wrapped" />
    renderControl({
      options: [
        { value: 'one', display: <em data-testid="custom-display">One</em> },
        { value: 'two', wrapper },
        { value: 'three', displayText: 'Three!' },
      ],
    })
    expect(screen.getByTestId('custom-display').textContent).toBe('One')
    expect(screen.getByTestId('wrapped').querySelector('button')).not.toBeNull()
    expect(screen.getByText('Three!')).toBeDefined()
  })

  it('mounts the roving indicator over the selected option with the legacy fill, presets, and fast-curve transition', () => {
    renderControl()
    const indicator = getIndicator()
    expect(indicator.className).toContain('bg-surface3')
    expect(indicator.className).toContain('rounded-full')
    expect(indicator.className).toContain('z-10')
    expect(indicator.className).toContain('animate-spore-enter-fade-in')
    expect(indicator.className).toContain('data-exiting:animate-spore-exit-fade-out')
    // Position/size ride the legacy `fast` curve, ported byte-exact from the
    // legacy web driver config.
    for (const property of ['transform', 'width', 'height']) {
      expect(indicator.style.transition).toContain(`${property} ${SPORE_ANIMATION_CURVE_CSS.fast}`)
    }
    // No color transition (repo rule: scope transitions to non-color
    // properties; the hover fill switches per-frame like the native leg).
    expect(indicator.style.transition).not.toContain('background')
  })

  it('swaps the indicator fill to the hovered token under the pointer', () => {
    renderControl()
    fireEvent.mouseEnter(getIndicator())
    expect(getIndicator().className).toContain('bg-surface3-hovered')
    fireEvent.mouseLeave(getIndicator())
    expect(getIndicator().className).not.toContain('bg-surface3-hovered')
  })

  it('drops the hover fill when the pill leaves under the pointer, so a remount paints unhovered (native parity)', () => {
    const { rerender } = renderControl()
    fireEvent.mouseEnter(getIndicator())
    expect(getIndicator().className).toContain('bg-surface3-hovered')

    // Remove the selected option: the pill loses its measurement source and
    // exits while the pointer is still over it — its onMouseLeave never fires.
    rerender(
      <SegmentedControl<string>
        options={[{ value: 'two' }, { value: 'three' }]}
        selectedOption="one"
        onSelectOption={() => undefined}
      />,
    )
    rerender(<SegmentedControl<string> options={[...OPTIONS]} selectedOption="one" onSelectOption={() => undefined} />)
    expect(getIndicator().className).not.toContain('bg-surface3-hovered')
  })

  it('keeps working as a controlled component across selections', () => {
    function Harness(): JSX.Element {
      const [selected, setSelected] = useState('one')
      return <SegmentedControl options={OPTIONS} selectedOption={selected} onSelectOption={setSelected} />
    }
    render(<Harness />)
    fireEvent.click(getOption('three'))
    expect(getOption('three').getAttribute('aria-selected')).toBe('true')
    expect(getOption('one').getAttribute('aria-selected')).toBe('false')
  })

  it('applies container variants: outlined border, fullWidth, gap override, variableOptionWidths', () => {
    renderControl({ fullWidth: true, gap: '$spacing2', variableOptionWidths: true })
    const tablist = screen.getByRole('tablist')
    expect(tablist.className).toContain('border-surface3')
    expect(tablist.className).toContain('w-full')
    expect(tablist.className).toContain('gap-0.5')
    const option = getOption('one')
    expect(option.className).toContain('grow')
    expect(option.className).toContain('basis-auto')
    expect(option.className).not.toContain('flex-1')

    // fullWidth without variableOptionWidths uses the same longhands on web:
    // legacy's `flex: 1` resolves to basis auto under react-native-web, not
    // Yoga's basis-0 equal split (see the web leg's comment).
    renderControl({ fullWidth: true })
    const fullWidthOption = screen.getAllByText('one').at(-1)?.closest('button')
    expect(fullWidthOption?.className).toContain('grow')
    expect(fullWidthOption?.className).toContain('basis-auto')
    expect(fullWidthOption?.className).not.toContain('flex-1')

    renderControl({ outlined: false })
    const borderless = screen.getAllByRole('tablist').at(-1)
    expect(borderless?.className).toContain('border-0')
    expect(borderless?.className).not.toContain('border-surface3')
  })
})
