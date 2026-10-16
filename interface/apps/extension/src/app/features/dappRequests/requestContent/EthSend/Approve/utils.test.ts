import { isApproveRevoke } from 'src/app/features/dappRequests/requestContent/EthSend/Approve/utils'

const SPENDER_WORD = `${'0'.repeat(24)}1111111111111111111111111111111111111111`
const ZERO_AMOUNT_WORD = '0'.repeat(64)
const ONE_AMOUNT_WORD = `${'0'.repeat(63)}1`

function approveCalldata(amountWord: string): string {
  return `0x095ea7b3${SPENDER_WORD}${amountWord}`
}

describe(isApproveRevoke, () => {
  it.each(['0x0', '0x00', '0x0000', undefined])(
    'recognizes a zero approval with transaction value %s as a revoke',
    (value) => {
      expect(isApproveRevoke({ value, data: approveCalldata(ZERO_AMOUNT_WORD) })).toBe(true)
    },
  )

  it('does not classify a zero approval carrying native value as a revoke', () => {
    expect(isApproveRevoke({ value: '0x01', data: approveCalldata(ZERO_AMOUNT_WORD) })).toBe(false)
  })

  it('does not classify a nonzero approval amount as a revoke', () => {
    expect(isApproveRevoke({ value: '0x00', data: approveCalldata(ONE_AMOUNT_WORD) })).toBe(false)
  })
})
