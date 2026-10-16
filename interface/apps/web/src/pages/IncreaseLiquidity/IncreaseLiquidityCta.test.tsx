vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { fireEvent, render, screen } from '@testing-library/react'
import { IncreaseLiquidityCta } from '~/pages/IncreaseLiquidity/IncreaseLiquidityCta'

const baseProps = {
  onVerifyIdentity: vi.fn(),
  onReview: vi.fn(),
  disabled: false,
  requestLoading: false,
  error: undefined,
  isGeoRestricted: false,
  geoUnavailableLabel: 'AAPLX unavailable in your region',
}

describe('IncreaseLiquidityCta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Verify Identity CTA instead of Review when the wallet is not allowlisted', () => {
    render(<IncreaseLiquidityCta {...baseProps} showVerifyIdentity={true} />)

    expect(screen.getByText('permissionedPool.verifyIdentity.cta')).toBeInTheDocument()
    expect(screen.queryByText('swap.button.review')).toBeNull()

    fireEvent.click(screen.getByText('permissionedPool.verifyIdentity.cta'))
    expect(baseProps.onVerifyIdentity).toHaveBeenCalledTimes(1)
    expect(baseProps.onReview).not.toHaveBeenCalled()
  })

  it('renders the Review CTA when the pair is not gated', () => {
    render(<IncreaseLiquidityCta {...baseProps} showVerifyIdentity={false} />)

    expect(screen.getByText('swap.button.review')).toBeInTheDocument()
    expect(screen.queryByText('permissionedPool.verifyIdentity.cta')).toBeNull()

    fireEvent.click(screen.getByText('swap.button.review'))
    expect(baseProps.onReview).toHaveBeenCalledTimes(1)
  })

  it('shows the input error as the button label when present', () => {
    render(<IncreaseLiquidityCta {...baseProps} showVerifyIdentity={false} error="Insufficient balance" />)

    expect(screen.getByText('Insufficient balance')).toBeInTheDocument()
  })

  it('keeps the Verify Identity CTA pressable even when the review path is disabled', () => {
    // The review button disables on txInfo errors; the verify CTA must not inherit that,
    // since the raw calldata rejection is exactly what the gate replaces.
    render(<IncreaseLiquidityCta {...baseProps} showVerifyIdentity={true} disabled={true} />)

    fireEvent.click(screen.getByText('permissionedPool.verifyIdentity.cta'))
    expect(baseProps.onVerifyIdentity).toHaveBeenCalledTimes(1)
  })

  it('replaces the Review CTA with an inert region-unavailable button when geo-restricted', () => {
    render(<IncreaseLiquidityCta {...baseProps} showVerifyIdentity={false} isGeoRestricted={true} />)

    expect(screen.getByText('AAPLX unavailable in your region')).toBeInTheDocument()
    expect(screen.queryByText('swap.button.review')).toBeNull()

    fireEvent.click(screen.getByText('AAPLX unavailable in your region'))
    expect(baseProps.onReview).not.toHaveBeenCalled()
  })

  // A region block has no remedy, so offering identity verification would send the user down a
  // path that cannot unblock them.
  it('outranks the Verify Identity CTA when a token is both permissioned and geo-restricted', () => {
    render(<IncreaseLiquidityCta {...baseProps} showVerifyIdentity={true} isGeoRestricted={true} />)

    expect(screen.getByText('AAPLX unavailable in your region')).toBeInTheDocument()
    expect(screen.queryByText('permissionedPool.verifyIdentity.cta')).toBeNull()
    expect(baseProps.onVerifyIdentity).not.toHaveBeenCalled()
  })

  // `disabled` is not a geo signal either. The gate fails open, so an unresolved check leaves
  // `isGeoRestricted` false; this prop comes from `Boolean(error) || !txInfo?.txRequest ||
  // Boolean(fotErrorToken)` (`IncreaseLiquidityForm.tsx:201`). Pins that those non-geo reasons keep
  // the CTA inert without borrowing the region-unavailable copy.
  it('keeps the Review CTA unpressable without geo copy when disabled for a non-geo reason', () => {
    render(<IncreaseLiquidityCta {...baseProps} showVerifyIdentity={false} disabled={true} />)

    fireEvent.click(screen.getByText('swap.button.review'))
    expect(baseProps.onReview).not.toHaveBeenCalled()
  })

  it('does not surface the input error label in place of the region-unavailable label', () => {
    render(
      <IncreaseLiquidityCta
        {...baseProps}
        showVerifyIdentity={false}
        isGeoRestricted={true}
        error="Insufficient balance"
      />,
    )

    expect(screen.getByText('AAPLX unavailable in your region')).toBeInTheDocument()
    expect(screen.queryByText('Insufficient balance')).toBeNull()
  })
})
