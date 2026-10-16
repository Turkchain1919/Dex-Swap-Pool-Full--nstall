export function getWithdrawCtaLabel({
  hasPositionBalance,
  inputAmount,
  isOverBalance,
  isOverWithdrawableLiquidity,
  labels,
}: {
  hasPositionBalance: boolean
  inputAmount: number
  isOverBalance: boolean
  isOverWithdrawableLiquidity: boolean
  labels: {
    enterAmount: string
    insufficientBalance: string
    loading: string
    lowLiquidity: string
    review: string
  }
}): string {
  if (inputAmount <= 0) {
    return labels.enterAmount
  }

  if (!hasPositionBalance) {
    return labels.loading
  }

  if (isOverWithdrawableLiquidity) {
    return labels.lowLiquidity
  }

  if (isOverBalance) {
    return labels.insufficientBalance
  }

  return labels.review
}
