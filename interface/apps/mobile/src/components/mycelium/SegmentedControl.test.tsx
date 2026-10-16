import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { SegmentedControl } from '@universe/mycelium/segmented-control-compat'
import { View } from 'react-native'
import { withSpring } from 'react-native-reanimated'
import { getFiberPropChain, getNearestFiberProp } from 'src/test/test-utils'

// Behavior tests for the INFRA-2966 native rebuild, mirroring the legacy
// component's test coverage (packages/ui SegmentedControl.test.tsx): disabled
// guards on the activation paths, plus the option rendering surface. They run
// here (not in @universe/mycelium) because mycelium's test environment is
// plain node — this app already has the React Native testing setup the
// .native implementation needs.

const OPTIONS = [
  { value: 'swap', displayText: 'Swap' },
  { value: 'limit', displayText: 'Limit', disabled: true },
  { value: 'buy', displayText: 'Buy' },
] as const

describe('SegmentedControl (native rebuild)', () => {
  it('renders every option label (displayText over value)', () => {
    render(<SegmentedControl options={OPTIONS} selectedOption="swap" onSelectOption={vi.fn()} />)
    expect(screen.getByText('Swap')).toBeTruthy()
    expect(screen.getByText('Limit')).toBeTruthy()
    expect(screen.getByText('Buy')).toBeTruthy()
    expect(screen.queryByText('swap')).toBeNull()
  })

  it('falls back to the option value when no displayText is given', () => {
    render(
      <SegmentedControl options={[{ value: '1D' }, { value: '1W' }]} selectedOption="1D" onSelectOption={vi.fn()} />,
    )
    expect(screen.getByText('1D')).toBeTruthy()
    expect(screen.getByText('1W')).toBeTruthy()
  })

  it('selects an enabled option on press', () => {
    const onSelectOption = vi.fn()
    render(<SegmentedControl options={OPTIONS} selectedOption="swap" onSelectOption={onSelectOption} />)
    fireEvent.press(screen.getByText('Buy'))
    expect(onSelectOption).toHaveBeenCalledWith('buy')
  })

  it('does not select a disabled option on press', () => {
    const onSelectOption = vi.fn()
    render(<SegmentedControl options={OPTIONS} selectedOption="swap" onSelectOption={onSelectOption} />)
    fireEvent.press(screen.getByText('Limit'))
    expect(onSelectOption).not.toHaveBeenCalled()
  })

  it('does not select anything when the whole control is disabled', () => {
    const onSelectOption = vi.fn()
    render(<SegmentedControl disabled options={OPTIONS} selectedOption="swap" onSelectOption={onSelectOption} />)
    fireEvent.press(screen.getByText('Buy'))
    fireEvent.press(screen.getByText('Swap'))
    expect(onSelectOption).not.toHaveBeenCalled()
  })

  it('exposes disabled and selected state to assistive tech', () => {
    render(<SegmentedControl options={OPTIONS} selectedOption="swap" onSelectOption={vi.fn()} />)
    // The legacy control exposes aria-disabled/aria-selected; the rebuild maps
    // them through accessibilityState.
    // Assert the accessibilityState prop the native renderer consumes (the
    // legacy control exposes the same states as aria-disabled/aria-selected).
    const limit = screen.getByRole('button', { name: 'Limit' })
    expect(getNearestFiberProp(limit, 'accessibilityState')).toMatchObject({ disabled: true })
    const swap = screen.getByRole('button', { name: 'Swap' })
    expect(getNearestFiberProp(swap, 'accessibilityState')).toMatchObject({ selected: true, disabled: undefined })
  })

  it('renders an href option with link semantics, unless disabled', () => {
    render(
      <SegmentedControl
        options={[
          { value: 'a', href: 'https://app.uniswap.org/a' },
          { value: 'b', href: 'https://app.uniswap.org/b', disabled: true },
        ]}
        selectedOption="a"
        onSelectOption={vi.fn()}
      />,
    )
    // Enabled href option keeps the link role; the disabled one falls back to
    // button (the legacy control also strips link semantics when disabled).
    expect(screen.getByRole('link', { name: 'a' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'b' })).toBeTruthy()
  })

  it('renders a custom display element instead of the text label', () => {
    render(
      <SegmentedControl
        options={[{ value: 'custom', display: <View testID="custom-display" /> }, { value: 'plain' }]}
        selectedOption="plain"
        onSelectOption={vi.fn()}
      />,
    )
    expect(screen.getByTestId('custom-display')).toBeTruthy()
    expect(screen.queryByText('custom')).toBeNull()
  })

  it('clones a wrapper element around the option', () => {
    render(
      <SegmentedControl
        options={[{ value: 'wrapped', wrapper: <View testID="option-wrapper" /> }, { value: 'plain' }]}
        selectedOption="plain"
        onSelectOption={vi.fn()}
      />,
    )
    const wrapper = screen.getByTestId('option-wrapper')
    expect(wrapper).toBeTruthy()
    expect(screen.getByText('wrapped')).toBeTruthy()
  })

  it('asserts the legacy 2-6 option bounds', () => {
    // Silence React's error logging for the intentional render throws.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      render(<SegmentedControl options={[{ value: 'only' }]} selectedOption="only" onSelectOption={vi.fn()} />),
    ).toThrow('Segmented control must have between 2 and 6 options, inclusive.')
    const seven = Array.from({ length: 7 }, (_, i) => ({ value: `o${i}` }))
    expect(() => render(<SegmentedControl options={seven} selectedOption="o0" onSelectOption={vi.fn()} />)).toThrow(
      'Segmented control must have between 2 and 6 options, inclusive.',
    )
    consoleError.mockRestore()
  })
})

describe('roving indicator lifecycle (AnimatePresence parity)', () => {
  // Inlined legacy `fast` spring (see FAST_SPRING in the component / INFRA-2967).
  const FAST_SPRING = { damping: 75, stiffness: 1000, mass: 1 }
  const INDICATOR = 'segmented-control-indicator'

  const layoutEvent = (layout: { x: number; y: number; width: number; height: number }): object => ({
    nativeEvent: { layout },
  })

  it('mounts the indicator only once the selected option reports a layout', () => {
    render(<SegmentedControl options={OPTIONS} selectedOption="swap" onSelectOption={vi.fn()} />)
    expect(screen.queryByTestId(INDICATOR)).toBeNull()
    fireEvent(screen.getByText('Swap'), 'layout', layoutEvent({ x: 4, y: 4, width: 56, height: 26 }))
    expect(screen.getByTestId(INDICATOR)).toBeTruthy()
  })

  it('survives React Native recycling the layout event after the handler returns', () => {
    // On device, RN pools synthetic events: once the synchronous onLayout
    // handler returns, event.nativeEvent is nulled. React defers setState
    // updater callbacks to the render flush whenever the queue already has a
    // pending update (only the first update on an empty queue is evaluated
    // eagerly), so a handler that reads event.nativeEvent inside the updater
    // crashes on every real mount — where every option reports its layout in
    // the same batch. RNTL's plain-object events are never recycled, hiding
    // the bug; reproduce it by firing two handlers in one batch and nulling
    // both events before React flushes at the end of act().
    render(<SegmentedControl options={OPTIONS} selectedOption="swap" onSelectOption={vi.fn()} />)
    type RecyclableEvent = {
      nativeEvent: { layout: { x: number; y: number; width: number; height: number } } | null
    }
    const swapOnLayout = getNearestFiberProp(screen.getByText('Swap'), 'onLayout') as (event: unknown) => void
    const limitOnLayout = getNearestFiberProp(screen.getByText('Limit'), 'onLayout') as (event: unknown) => void
    expect(typeof swapOnLayout).toBe('function')
    expect(typeof limitOnLayout).toBe('function')
    const swapEvent: RecyclableEvent = { nativeEvent: { layout: { x: 4, y: 4, width: 56, height: 26 } } }
    const limitEvent: RecyclableEvent = { nativeEvent: { layout: { x: 68, y: 4, width: 52, height: 26 } } }
    act(() => {
      swapOnLayout(swapEvent)
      limitOnLayout(limitEvent)
      swapEvent.nativeEvent = null
      limitEvent.nativeEvent = null
    })
    // No crash, and the layouts were captured before recycling: the indicator
    // mounted from the selected option's stored rect.
    expect(screen.getByTestId(INDICATOR)).toBeTruthy()
  })

  it('runs the legacy exit fade when the selected option has no measured layout, and re-enters when one arrives', () => {
    const { rerender } = render(<SegmentedControl options={OPTIONS} selectedOption="swap" onSelectOption={vi.fn()} />)
    fireEvent(screen.getByText('Swap'), 'layout', layoutEvent({ x: 4, y: 4, width: 56, height: 26 }))
    expect(screen.getByTestId(INDICATOR)).toBeTruthy()

    // Selecting an option that hasn't reported a layout yet leaves activeAt
    // undefined: the indicator must fade out with the fast spring while
    // staying rendered at its last rect — an AnimatePresence-style exit, not
    // an instant unmount or a stale-position jump. (The vitest reanimated mock
    // never fires spring completion callbacks, so the post-fade unmount itself
    // isn't observable here.)
    vi.mocked(withSpring).mockClear()
    rerender(<SegmentedControl options={OPTIONS} selectedOption="buy" onSelectOption={vi.fn()} />)
    expect(vi.mocked(withSpring)).toHaveBeenCalledWith(0, FAST_SPRING, expect.any(Function))
    expect(screen.getByTestId(INDICATOR)).toBeTruthy()

    // The layout arriving re-enters the indicator: opacity springs back to 1.
    vi.mocked(withSpring).mockClear()
    fireEvent(screen.getByText('Buy'), 'layout', layoutEvent({ x: 120, y: 4, width: 48, height: 26 }))
    expect(vi.mocked(withSpring)).toHaveBeenCalledWith(1, FAST_SPRING)
    expect(screen.getByTestId(INDICATOR)).toBeTruthy()
  })

  it('prunes the stored layout when its option leaves `options`, starting the exit fade', () => {
    const { rerender } = render(
      <SegmentedControl<'swap' | 'limit' | 'buy'> options={OPTIONS} selectedOption="swap" onSelectOption={vi.fn()} />,
    )
    fireEvent(screen.getByText('Swap'), 'layout', layoutEvent({ x: 4, y: 4, width: 56, height: 26 }))
    expect(screen.getByTestId(INDICATOR)).toBeTruthy()

    // 'swap' leaves the rendered options: without pruning, its stale rect
    // would keep placing the indicator forever; with pruning, activeAt goes
    // undefined and the exit fade starts.
    vi.mocked(withSpring).mockClear()
    rerender(
      <SegmentedControl<'swap' | 'limit' | 'buy'>
        options={[
          { value: 'limit', displayText: 'Limit' },
          { value: 'buy', displayText: 'Buy' },
        ]}
        selectedOption="swap"
        onSelectOption={vi.fn()}
      />,
    )
    expect(vi.mocked(withSpring)).toHaveBeenCalledWith(0, FAST_SPRING, expect.any(Function))
  })

  it('clears the hover highlight when the hovered option leaves `options`', () => {
    // Regression: hoveredValue is value-keyed, so without pruning it would
    // survive its option's removal and a re-added option with the same value
    // would render pre-hovered without any pointer movement.
    const { rerender } = render(
      <SegmentedControl<'swap' | 'limit' | 'buy'> options={OPTIONS} selectedOption="buy" onSelectOption={vi.fn()} />,
    )
    const onHoverIn = getNearestFiberProp(screen.getByText('Swap'), 'onHoverIn') as () => void
    expect(typeof onHoverIn).toBe('function')
    // react-native-web rewrites className on the host element, so read the
    // component-level prop from the fiber chain instead of the nearest fiber.
    const swapTextClasses = (): string => getFiberPropChain(screen.getByText('Swap'), 'className').join(' ')
    act(() => onHoverIn())
    expect(swapTextClasses()).toContain('text-neutral1')

    rerender(
      <SegmentedControl<'swap' | 'limit' | 'buy'>
        options={[
          { value: 'limit', displayText: 'Limit' },
          { value: 'buy', displayText: 'Buy' },
        ]}
        selectedOption="buy"
        onSelectOption={vi.fn()}
      />,
    )
    rerender(
      <SegmentedControl<'swap' | 'limit' | 'buy'> options={OPTIONS} selectedOption="buy" onSelectOption={vi.fn()} />,
    )
    expect(swapTextClasses()).toContain('text-neutral2')
    expect(swapTextClasses()).not.toContain('text-neutral1')
  })

  it('reserves the legacy 1px root frame with a resolved transparent border, never a paintable one', () => {
    render(<SegmentedControl options={OPTIONS} selectedOption="swap" onSelectOption={vi.fn()} />)
    // The root frame must reserve its 1px border via a deterministic inline
    // style whose RESOLVED color is transparent — pinning the class NAME
    // (`border-transparent`) let a black frame through CI: border classes
    // resolve through uniwind's build-time class map, and on a map miss the
    // runtime leaves borderColor undefined and falls back to #000000
    // (uniwind store.ts), the rgb(0,0,0) ring QA measured on device. Walk the
    // style props out from an option label to the root wrapper and assert the
    // frame's resolved values.
    const styleChain = getFiberPropChain(screen.getByText('Swap'), 'style')
    const flatten = (s: unknown): Record<string, unknown>[] =>
      Array.isArray(s)
        ? s.flatMap(flatten)
        : s !== null && s !== undefined && typeof s === 'object'
          ? [s as Record<string, unknown>]
          : []
    const frame = styleChain.flatMap(flatten).find((s) => s['borderWidth'] === 1)
    expect(frame).toBeDefined()
    expect(frame?.['borderColor']).toBe('transparent')
    // The pill container itself still clips through its own classes.
    const classChain = getFiberPropChain(screen.getByText('Swap'), 'className').join(' ')
    expect(classChain).toContain('overflow-hidden')
  })

  it('does not hover disabled options (legacy <button disabled> suppresses mouse events)', () => {
    const onHoverOption = vi.fn()
    render(
      <SegmentedControl
        options={OPTIONS}
        selectedOption="swap"
        onHoverOption={onHoverOption}
        onSelectOption={vi.fn()}
      />,
    )
    const onHoverIn = getNearestFiberProp(screen.getByText('Limit'), 'onHoverIn') as () => void
    act(() => onHoverIn())
    expect(onHoverOption).not.toHaveBeenCalled()
    // Enabled options still hover through the same handler.
    const buyHoverIn = getNearestFiberProp(screen.getByText('Buy'), 'onHoverIn') as () => void
    act(() => buyHoverIn())
    expect(onHoverOption).toHaveBeenCalledWith('buy')
  })

  it('drops the pill hover highlight when the exit fade completes, so a remount is never pre-hovered', () => {
    // The pill unmounts without firing onHoverOut, so indicatorHovered must
    // be cleared on the exit-complete transition — otherwise a remounted
    // indicator renders the hovered fill with no pointer over it.
    const { rerender } = render(
      <SegmentedControl<'swap' | 'limit' | 'buy'> options={OPTIONS} selectedOption="swap" onSelectOption={vi.fn()} />,
    )
    fireEvent(screen.getByText('Swap'), 'layout', layoutEvent({ x: 4, y: 4, width: 56, height: 26 }))
    const pill = (screen.getByTestId(INDICATOR) as unknown as Element).firstElementChild
    const pillHoverIn = getNearestFiberProp(pill, 'onHoverIn') as () => void
    act(() => pillHoverIn())
    expect(getFiberPropChain(pill, 'className').join(' ')).toContain('bg-surface3-hovered')

    // Selecting an option with no measured layout starts the exit fade; the
    // withSpring mock returns immediately, so complete the fade by invoking
    // the completion callback it captured (runOnJS is an identity mock).
    vi.mocked(withSpring).mockClear()
    rerender(
      <SegmentedControl<'swap' | 'limit' | 'buy'> options={OPTIONS} selectedOption="buy" onSelectOption={vi.fn()} />,
    )
    const exitCall = vi.mocked(withSpring).mock.calls.find((call) => call[0] === 0 && typeof call[2] === 'function')
    expect(exitCall).toBeDefined()
    act(() => (exitCall?.[2] as (finished: boolean) => void)(true))
    expect(screen.queryByTestId(INDICATOR)).toBeNull()

    // Remount via the new selection's layout: the pill must come back in the
    // resting fill, not the stale hovered one.
    fireEvent(screen.getByText('Buy'), 'layout', layoutEvent({ x: 120, y: 4, width: 48, height: 26 }))
    const remountedPill = (screen.getByTestId(INDICATOR) as unknown as Element).firstElementChild
    const remountedClasses = getFiberPropChain(remountedPill, 'className').join(' ')
    expect(remountedClasses).toContain('bg-surface3')
    expect(remountedClasses).not.toContain('bg-surface3-hovered')
  })

  it('tracks the indicator hover highlight on the pill itself (legacy hoverStyle parity)', () => {
    // The overlay intercepts the pointer above the selected option, so the
    // surface3-hovered fill must come from the pill's own hover events —
    // matching the legacy TabsRovingIndicator's hoverStyle.
    render(<SegmentedControl options={OPTIONS} selectedOption="swap" onSelectOption={vi.fn()} />)
    fireEvent(screen.getByText('Swap'), 'layout', { nativeEvent: { layout: { x: 4, y: 4, width: 56, height: 26 } } })
    // The vitest setup maps RNTL onto @testing-library/react, so queries
    // return DOM elements at runtime despite the ReactTestInstance typing.
    const pill = (screen.getByTestId(INDICATOR) as unknown as Element).firstElementChild
    expect(pill).toBeTruthy()
    const pillClasses = (): string => getFiberPropChain(pill, 'className').join(' ')
    expect(pillClasses()).toContain('bg-surface3')
    expect(pillClasses()).not.toContain('bg-surface3-hovered')
    const pillHoverIn = getNearestFiberProp(pill, 'onHoverIn') as () => void
    expect(typeof pillHoverIn).toBe('function')
    act(() => pillHoverIn())
    expect(pillClasses()).toContain('bg-surface3-hovered')
    const pillHoverOut = getNearestFiberProp(pill, 'onHoverOut') as () => void
    act(() => pillHoverOut())
    expect(pillClasses()).not.toContain('bg-surface3-hovered')
  })
})
