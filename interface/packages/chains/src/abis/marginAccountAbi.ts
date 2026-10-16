import type { Abi } from 'viem'

// Minimal MarginAccount surface used by stranded-equity recovery: sweep the
// parked collateral out to the owner. Matches IMarginAccount.sweep (owner-gated
// on-chain — v4-periphery src/MarginAccount.sol).
export const marginAccountAbi = [
  {
    type: 'function',
    name: 'sweep',
    inputs: [
      { name: 'currency', type: 'address', internalType: 'Currency' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'to', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi

export type MarginAccountAbi = typeof marginAccountAbi
