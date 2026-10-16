import { SPORE_ANIMATION_CURVE_CSS } from '@universe/tailwind/animations'
import {
  ACTIVE_ROW_TRANSITION_CLASSES,
  HIDDEN_ROW_TRANSITION_CLASSES,
  RecoveryPhraseVerification,
} from 'src/app/features/recoveryPhraseVerification/RecoveryPhraseVerification'
import { render } from 'src/test/test-utils'

// Drift pin: the per-row transition classes in RecoveryPhraseVerification.tsx
// hand-copy their cubic-bezier/duration/delay values from SPORE_ANIMATION_CURVE_CSS
// instead of importing it, because Tailwind's arbitrary-value classes must be
// static strings the JIT scanner can see — they can't reference a runtime import.
// This test compares the component's exported class-name constants against the
// source-of-truth CSS shorthand and fails if they diverge, so a retune of
// SPORE_ANIMATION_CURVE_CSS surfaces here instead of drifting silently.

interface ParsedCurve {
  durationMs: number
  bezier: [number, number, number, number]
  delayMs?: number
}

function parseCurveCss(curveCss: string): ParsedCurve {
  // oxlint-disable-next-line security/detect-unsafe-regex -- curveCss is a static, in-repo SPORE_ANIMATION_CURVE_CSS entry, not user input; anchored, no quantifier overlap, ReDoS-safe
  const match = /^(\d+)ms cubic-bezier\(([^)]+)\)(?: (\d+)ms)?$/.exec(curveCss)
  if (!match?.[1] || !match[2]) {
    throw new Error(`unparseable SPORE_ANIMATION_CURVE_CSS entry: ${curveCss}`)
  }
  const bezier = match[2].split(',').map((n) => Number(n.trim()))
  if (bezier.length !== 4 || bezier.some((n) => Number.isNaN(n))) {
    throw new Error(`unparseable cubic-bezier args in: ${curveCss}`)
  }
  return {
    durationMs: Number(match[1]),
    bezier: bezier as [number, number, number, number],
    delayMs: match[3] ? Number(match[3]) : undefined,
  }
}

function parseTailwindClasses(classes: string): ParsedCurve {
  const durationMatch = /duration-(\d+)/.exec(classes)
  const bezierMatch = /ease-\[cubic-bezier\(([^)]+)\)\]/.exec(classes)
  const delayMatch = /delay-\[(\d+)ms\]/.exec(classes)
  if (!durationMatch?.[1] || !bezierMatch?.[1]) {
    throw new Error(`unparseable Tailwind transition classes: ${classes}`)
  }
  const bezier = bezierMatch[1].split(',').map((n) => Number(n.trim()))
  if (bezier.length !== 4 || bezier.some((n) => Number.isNaN(n))) {
    throw new Error(`unparseable cubic-bezier args in: ${classes}`)
  }
  return {
    durationMs: Number(durationMatch[1]),
    bezier: bezier as [number, number, number, number],
    delayMs: delayMatch?.[1] ? Number(delayMatch[1]) : undefined,
  }
}

describe('RecoveryPhraseVerification hand-copied curve classes', () => {
  test('the hidden-row transition matches SPORE_ANIMATION_CURVE_CSS.stiff', () => {
    expect(parseTailwindClasses(HIDDEN_ROW_TRANSITION_CLASSES)).toEqual(parseCurveCss(SPORE_ANIMATION_CURVE_CSS.stiff))
  })

  test('the active-row transition matches SPORE_ANIMATION_CURVE_CSS.quickishDelayed', () => {
    expect(parseTailwindClasses(ACTIVE_ROW_TRANSITION_CLASSES)).toEqual(
      parseCurveCss(SPORE_ANIMATION_CURVE_CSS.quickishDelayed),
    )
  })

  test('both rows transition exactly transform and opacity', () => {
    expect(/transition-\[([^\]]+)\]/.exec(HIDDEN_ROW_TRANSITION_CLASSES)?.[1]).toBe('transform,opacity')
    expect(/transition-\[([^\]]+)\]/.exec(ACTIVE_ROW_TRANSITION_CLASSES)?.[1]).toBe('transform,opacity')
  })
})

// Wiring pin: the tests above only compare the exported constants against
// SPORE_ANIMATION_CURVE_CSS — they never look at the rendered component, so
// deleting the `className={...}` prop on the row `Flex` in
// RecoveryPhraseVerification.tsx would leave them green while the transition
// silently stopped firing. This asserts the actual DOM element the component
// renders carries the classes, not just that the constants have the right shape.
describe('RecoveryPhraseVerification row className wiring', () => {
  test('the current (non-hidden) row actually renders with ACTIVE_ROW_TRANSITION_CLASSES', () => {
    const { container } = render(
      <RecoveryPhraseVerification
        mnemonic={['apple', 'banana', 'cherry']}
        numberOfTests={2}
        onComplete={vi.fn()}
        onWordVerified={vi.fn()}
        setHasError={vi.fn()}
        setSubtitle={vi.fn()}
      />,
    )

    // On initial render `current` is 0, so every row is the "active" (not-yet-verified)
    // branch of the isHidden ternary — none are hidden yet.
    const activeClassTokens = ACTIVE_ROW_TRANSITION_CLASSES.split(' ')
    const hiddenOnlyToken = HIDDEN_ROW_TRANSITION_CLASSES.split(' ').find((token) => !activeClassTokens.includes(token))
    if (!hiddenOnlyToken) {
      throw new Error('expected HIDDEN_ROW_TRANSITION_CLASSES to have a token distinct from the active classes')
    }

    const rowElements = Array.from(container.querySelectorAll<HTMLElement>('div'))
    const activeRow = rowElements.find((el) => activeClassTokens.every((token) => el.classList.contains(token)))

    // A real DOM assertion: the rendered row element's className must actually carry
    // every token of ACTIVE_ROW_TRANSITION_CLASSES, and none of the hidden-only ones —
    // not merely that the exported constant string has the expected shape.
    expect(activeRow).toBeTruthy()
    expect(activeRow?.classList.contains(hiddenOnlyToken)).toBe(false)
  })
})
