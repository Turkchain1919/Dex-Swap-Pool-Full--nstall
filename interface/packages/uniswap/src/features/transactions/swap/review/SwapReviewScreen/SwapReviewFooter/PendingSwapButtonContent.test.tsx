import { TradingApi } from '@universe/api'
import { PendingSwapButtonContent } from 'uniswap/src/features/transactions/swap/review/SwapReviewScreen/SwapReviewFooter/PendingSwapButtonContent'
import { render, screen } from 'uniswap/src/test/test-utils'

function getLabel(text: string): HTMLElement {
  const node: unknown = screen.getByText(text)
  if (!(node instanceof HTMLElement)) {
    throw new Error(`the "${text}" label did not render as a DOM element`)
  }
  return node
}

function getFrame(label: HTMLElement): HTMLElement {
  const node = label.closest('button')
  if (!(node instanceof HTMLElement)) {
    throw new Error('the pending label did not render inside a button frame')
  }
  return node
}

// Token-exact: a substring match would also accept `text-neutral2Hovered` or `dark:text-neutral2`.
function classTokens(element: HTMLElement): string[] {
  return element.className.split(/\s+/)
}

describe(PendingSwapButtonContent, () => {
  // Regression guard for CONS-2613/CONS-2645: Earn renders this outside SwapReviewScreen's
  // store providers, so it must never depend on the swap review stores.
  it('renders plan progress without swap review store providers', () => {
    render(
      <PendingSwapButtonContent
        disabled
        currentStepIndex={1}
        steps={[{ stepType: TradingApi.PlanStepType.VAULT_WITHDRAW, tokenInChainId: TradingApi.ChainId._1 }]}
        submissionText="Withdrawing…"
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('Withdrawing…')).toBeDefined()
  })

  it('falls back to the delayed submission text when no submission text is given', () => {
    render(<PendingSwapButtonContent disabled currentStepIndex={0} steps={undefined} onSubmit={vi.fn()} />)

    expect(screen.getByText('swap.button.submitting')).toBeDefined()
  })

  // `text-surface1` is the other Button family's context default cell, unreadable over `bg-surface2`.
  it("paints the delayed submission label in the disabled frame's own cell", () => {
    render(<PendingSwapButtonContent disabled currentStepIndex={0} steps={undefined} onSubmit={vi.fn()} />)

    const label = getLabel('swap.button.submitting')

    expect(classTokens(getFrame(label))).toContain('bg-surface2')
    expect(classTokens(label)).toContain('text-neutral2')
    expect(classTokens(label)).not.toContain('text-surface1')
  })

  // `ButtonTextCompat` drops the inline color pin while disabled; an inline pin would otherwise beat
  // the frame's cell class outright.
  it('leaves the explicit submission label on the frame cell, accent pin inert, while disabled', () => {
    render(
      <PendingSwapButtonContent
        disabled
        currentStepIndex={0}
        steps={undefined}
        submissionText="Withdrawing…"
        onSubmit={vi.fn()}
      />,
    )

    const label = getLabel('Withdrawing…')

    expect(label.style.color).toBe('')
    expect(classTokens(getFrame(label))).toContain('bg-surface2')
    expect(classTokens(label)).toContain('text-neutral2')
  })
})
