import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AccordionCompat } from './AccordionCompat.native'

// Mycelium has no native-runtime test lane (see HeightAnimator.native.test.tsx):
// this runs the native leg's own machine and prop wiring in the package's jsdom
// vitest, where the compat hosts resolve their web legs — the contract under
// test is what THIS leg passes to its hosts, not RN rendering. RN's folding of
// aria-expanded/aria-disabled into accessibilityState is React Native's own
// documented contract (Libraries/Components/View/View.js).

function renderSingle(props: { collapsible?: boolean; disabled?: boolean; defaultValue?: string }): {
  trigger: HTMLElement
  container: HTMLElement
} {
  const { collapsible, disabled, defaultValue } = props
  const { container } = render(
    <AccordionCompat collapsible={collapsible} disabled={disabled} defaultValue={defaultValue} type="single">
      <AccordionCompat.Item value="a1">
        <AccordionCompat.Header>section title</AccordionCompat.Header>
        <AccordionCompat.Trigger>
          {({ open }: { open: boolean }) => <span data-probe={String(open)}>t</span>}
        </AccordionCompat.Trigger>
        <AccordionCompat.Content>content</AccordionCompat.Content>
      </AccordionCompat.Item>
    </AccordionCompat>,
  )
  const trigger = container.querySelector('[data-probe]')?.parentElement as HTMLElement
  return { trigger, container }
}

describe('AccordionCompat native leg', () => {
  it('press toggles the item and the render prop tracks it', () => {
    const { trigger, container } = renderSingle({ collapsible: true })
    expect(container.querySelector('[data-probe]')?.getAttribute('data-probe')).toBe('false')
    fireEvent.click(trigger)
    expect(container.querySelector('[data-probe]')?.getAttribute('data-probe')).toBe('true')
    fireEvent.click(trigger)
    expect(container.querySelector('[data-probe]')?.getAttribute('data-probe')).toBe('false')
  })

  it('forwards the legacy aria surface: aria-expanded, and aria-disabled only when open and not collapsible', () => {
    const { trigger, container } = renderSingle({ defaultValue: 'a1' })
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(trigger.getAttribute('aria-disabled')).toBe('true')

    const collapsibleCase = renderSingle({ collapsible: true, defaultValue: 'a1' })
    expect(collapsibleCase.trigger.getAttribute('aria-expanded')).toBe('true')
    expect(collapsibleCase.trigger.getAttribute('aria-disabled')).toBeNull()
    expect(container).toBeTruthy()
  })

  it('root disabled gates the trigger (legacy `accordionContext.disabled || props.disabled`)', () => {
    const { trigger, container } = renderSingle({ collapsible: true, disabled: true })
    fireEvent.click(trigger)
    expect(container.querySelector('[data-probe]')?.getAttribute('data-probe')).toBe('false')
  })

  it('caller disabled={false} on the trigger overrides the fold, matching the web resolution', () => {
    const { container } = render(
      <AccordionCompat collapsible={true} disabled={true} type="single">
        <AccordionCompat.Item value="a1">
          <AccordionCompat.Trigger disabled={false}>
            {({ open }: { open: boolean }) => <span data-probe={String(open)}>t</span>}
          </AccordionCompat.Trigger>
          <AccordionCompat.Content>content</AccordionCompat.Content>
        </AccordionCompat.Item>
      </AccordionCompat>,
    )
    const trigger = container.querySelector('[data-probe]')?.parentElement as HTMLElement
    fireEvent.click(trigger)
    expect(container.querySelector('[data-probe]')?.getAttribute('data-probe')).toBe('true')
  })

  it('Header hosts on the Text twin, so a bare string child renders (an RN View would throw on device)', () => {
    const { container } = renderSingle({ collapsible: true })
    expect(container.textContent).toContain('section title')
  })

  it('press feedback swaps the legacy pressStyle background in state', () => {
    const { trigger } = renderSingle({ collapsible: true })
    expect(trigger.className).toContain('bg-surface1')
    fireEvent.mouseDown(trigger)
    expect(trigger.className).toContain('bg-surface2')
    fireEvent.mouseUp(trigger)
    expect(trigger.className).not.toContain('bg-surface2')
  })
})
