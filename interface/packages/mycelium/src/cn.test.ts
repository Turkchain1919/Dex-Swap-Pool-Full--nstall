/**
 * `cn()` conflict-resolution contract, executed through the real merger rather
 * than reasoned about. Numeric Spore radii are not part of tailwind-merge's
 * stock radius scale (it only knows t-shirt sizes), so without the
 * `theme.radius` extension in ./cn every `rounded-<n>` is an unknown class,
 * both sides survive a merge and stylesheet emission order silently picks the
 * winner. `--radius-20` is declared before `--radius-28` in
 * packages/tailwind/css/theme.css, so `rounded-28` used to beat a consumer's
 * `rounded-20` regardless of class order.
 */
import { radii } from '@universe/tailwind'
import { describe, expect, it } from 'vitest'
import { cn } from './cn'

const RADIUS_KEYS = Object.keys(radii)

describe('cn() — Spore radius scale', () => {
  it('resolves a consumer override of the shorthand radius (the dev-portal Sheet regression)', () => {
    expect(cn('rounded-28', 'rounded-20')).toBe('rounded-20')
    // ...and in the other order, so it is the later class that wins, not the token order
    expect(cn('rounded-20', 'rounded-28')).toBe('rounded-28')
  })

  it('resolves per-corner and per-side overrides', () => {
    expect(cn('rounded-tl-28', 'rounded-tl-20')).toBe('rounded-tl-20')
    expect(cn('rounded-t-20', 'rounded-t-12')).toBe('rounded-t-12')
    expect(cn('rounded-b-12', 'rounded-b-none')).toBe('rounded-b-none')
    expect(cn('rounded-l-12', 'rounded-l-32')).toBe('rounded-l-32')
    expect(cn('rounded-r-12', 'rounded-r-full')).toBe('rounded-r-full')
    // logical (RTL-aware) forms
    expect(cn('rounded-s-8', 'rounded-s-32')).toBe('rounded-s-32')
    expect(cn('rounded-e-8', 'rounded-e-32')).toBe('rounded-e-32')
    expect(cn('rounded-ss-8', 'rounded-ss-32')).toBe('rounded-ss-32')
    expect(cn('rounded-ee-8', 'rounded-ee-32')).toBe('rounded-ee-32')
  })

  it('resolves arbitrary values and the stock t-shirt scale against numeric radii', () => {
    expect(cn('rounded-28', 'rounded-[24px]')).toBe('rounded-[24px]')
    expect(cn('rounded-[24px]', 'rounded-28')).toBe('rounded-28')
    expect(cn('rounded-28', 'rounded-lg')).toBe('rounded-lg')
    // checkbox.tsx traded a rounded-[4px] that merged for a rounded-6 that did not
    expect(cn('rounded-6', 'rounded-[4px]')).toBe('rounded-[4px]')
    expect(cn('rounded-6', 'rounded-12')).toBe('rounded-12')
  })

  it('keeps the shorthand-beats-corner conflict graph tailwind-merge ships', () => {
    // the shorthand supersedes an earlier per-side/per-corner radius
    expect(cn('rounded-t-20', 'rounded-20')).toBe('rounded-20')
    // but a later per-side radius only refines the shorthand
    expect(cn('rounded-20', 'rounded-t-12')).toBe('rounded-20 rounded-t-12')
  })

  it('covers every member of the scale in css/theme.css', () => {
    // integer-like keys first (JS property order), then `none` / `full`
    expect([...RADIUS_KEYS].sort()).toEqual(['none', '4', '6', '8', '12', '16', '20', '24', '28', '32', 'full'].sort())
    const merged = RADIUS_KEYS.map((key) => cn(`rounded-${key === 'none' ? '12' : 'none'}`, `rounded-${key}`))
    expect(merged).toEqual(RADIUS_KEYS.map((key) => `rounded-${key}`))
  })
})

describe('cn() — typography and colour groups (pre-existing contract)', () => {
  it('resolves Spore type tokens against stock font sizes', () => {
    expect(cn('text-sm', 'text-body-1')).toBe('text-body-1')
    expect(cn('text-subheading-1', 'text-lg')).toBe('text-lg')
  })

  it('resolves Spore colours against each other', () => {
    expect(cn('text-neutral2', 'text-neutral3')).toBe('text-neutral3')
  })
})

describe('cn() — white-space / overflow-wrap cross-form groups (INFRA-3496)', () => {
  // The compat compilers spell one property two ways (utility + arbitrary
  // property), and the arbitrary rules sort BEFORE the utilities in the
  // emitted stylesheet — without these groups both classes survive and the
  // frame default wins over the pool value.
  it('arbitrary white-space conflicts with the whitespace-* utilities, both directions', () => {
    expect(cn('whitespace-pre-wrap', '[white-space:wrap]')).toBe('[white-space:wrap]')
    expect(cn('[white-space:initial]', 'whitespace-nowrap')).toBe('whitespace-nowrap')
    // The var-indirection twin rides the same group.
    expect(cn('whitespace-pre-wrap', '[white-space:var(--c-ws)]')).toBe('[white-space:var(--c-ws)]')
  })

  it('word-wrap and its modern alias overflow-wrap share one group', () => {
    expect(cn('[word-wrap:break-word]', '[overflow-wrap:anywhere]')).toBe('[overflow-wrap:anywhere]')
    expect(cn('[overflow-wrap:anywhere]', '[word-wrap:break-word]')).toBe('[word-wrap:break-word]')
  })

  it('variant-prefixed spellings stay independent of the base pool', () => {
    // Composed at runtime so the scanners never lift a variant-prefixed
    // candidate out of this test file (only the safelisted base form appears).
    const hoverWrap = `hover:${'[white-space:wrap]'}`
    expect(cn('whitespace-pre-wrap', hoverWrap)).toBe(`whitespace-pre-wrap ${hoverWrap}`)
  })
})

describe('cn() — text-decoration cross-form group (INFRA-3496)', () => {
  // Same failure mode as white-space/overflow-wrap above: `textDecorationLine`
  // compiles to the curated underline/line-through/no-underline utilities,
  // while the `textDecoration` shorthand long tail compiles to
  // `[text-decoration:…]` arbitrary properties — without a shared group both
  // survive the merge and the frame default wins over the pool value.
  it('arbitrary text-decoration conflicts with the underline/line-through/no-underline utilities, both directions', () => {
    expect(cn('no-underline', '[text-decoration:underline]')).toBe('[text-decoration:underline]')
    expect(cn('[text-decoration:none]', 'underline')).toBe('underline')
    // The var-indirection twin rides the same group.
    expect(cn('line-through', '[text-decoration:var(--c-td)]')).toBe('[text-decoration:var(--c-td)]')
  })

  it('does not fold in the [text-decoration-line:…] arbitrary form', () => {
    // TouchableArea's anchor base classes deliberately pair
    // `[text-decoration-line:none]` with `[text-decoration:none]` as two
    // simultaneous declarations (touchable-area/compile.ts ANCHOR_CLASSES),
    // not competing pool values — they must both survive.
    expect(cn('[text-decoration-line:none]', '[text-decoration:none]')).toBe(
      '[text-decoration-line:none] [text-decoration:none]',
    )
  })

  it('variant-prefixed spellings stay independent of the base pool', () => {
    // Composed at runtime so the scanners never lift a variant-prefixed
    // candidate out of this test file (only the safelisted base form appears).
    const hoverDecoration = `hover:${'[text-decoration:underline]'}`
    expect(cn('no-underline', hoverDecoration)).toBe(`no-underline ${hoverDecoration}`)
  })
})
