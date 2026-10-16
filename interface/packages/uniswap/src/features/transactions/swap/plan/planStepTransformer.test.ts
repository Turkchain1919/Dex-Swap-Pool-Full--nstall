import { TradingApi } from '@universe/api'
import { TransactionStepType } from 'uniswap/src/features/transactions/steps/types'
import { transformStep } from 'uniswap/src/features/transactions/swap/plan/planStepTransformer'

function createSignMsgStep(stepType: TradingApi.PlanStepType): TradingApi.PlanStep {
  return {
    stepType,
    method: TradingApi.PlanStepMethod.SIGN_MSG,
    payload: {
      domain: { name: 'Permit2' },
      types: { PermitSingle: [] },
      values: { spender: '0x0000000000000000000000000000000000000001' },
    },
  } as unknown as TradingApi.PlanStep
}

describe(transformStep, () => {
  it('does not throw on a MARGIN_* SIGN_MSG step and falls to Permit2 (not UniswapX) signing, like VAULT_DEPOSIT', () => {
    const step = transformStep(createSignMsgStep(TradingApi.PlanStepType.MARGIN_OPEN))

    expect(step.type).toBe(TransactionStepType.Permit2Signature)
  })
})
