import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Field, FieldLabel } from './field'
import { Input } from './input'

afterEach(cleanup)

// jsdom's CSSOM drops var()-based declarations, so assert on the emitted classes.
const classesOf = (element: Element | null): string[] =>
  (element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

describe('Field', () => {
  it('owns the 12px label→control gap (gap-3)', () => {
    const { container } = render(
      <Field>
        <FieldLabel htmlFor="amount">Amount</FieldLabel>
        <Input id="amount" />
      </Field>,
    )
    const field = container.querySelector('[data-slot="field"]')
    expect(field).not.toBeNull()
    expect(classesOf(field)).toContain('gap-3')
    expect(classesOf(field)).toContain('flex-col')
  })

  it('provides the group/field scope SelectTrigger keys off', () => {
    const { container } = render(
      <Field>
        <FieldLabel htmlFor="amount">Amount</FieldLabel>
      </Field>,
    )
    expect(classesOf(container.querySelector('[data-slot="field"]'))).toContain('group/field')
  })

  // select.tsx's `group-has-[[data-slot=field-label]]/field:` placeholder rule is dead
  // without this attribute — it shipped before any component emitted it.
  it('emits data-slot="field-label" on the label', () => {
    const { container } = render(
      <Field>
        <FieldLabel htmlFor="amount">Amount</FieldLabel>
      </Field>,
    )
    const label = container.querySelector('[data-slot="field-label"]')
    expect(label).not.toBeNull()
    expect(label?.tagName.toLowerCase()).toBe('label')
    expect(label?.getAttribute('for')).toBe('amount')
  })

  it('keeps className merging on both parts', () => {
    const { container } = render(
      <Field className="w-80">
        <FieldLabel className="text-neutral1" htmlFor="amount">
          Amount
        </FieldLabel>
      </Field>,
    )
    expect(classesOf(container.querySelector('[data-slot="field"]'))).toContain('w-80')
    expect(classesOf(container.querySelector('[data-slot="field-label"]'))).toContain('text-neutral1')
  })
})
