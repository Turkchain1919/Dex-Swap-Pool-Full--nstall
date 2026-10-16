import type { Abi } from 'viem'

// Minimal MarginRouter surface: the counterfactual account address for an (owner, subId) pair, which
// the plan executor reads to pin the only non-router target a recovery sweep may have. Matches
// @uniswap/margin-sdk's generated MARGIN_ROUTER_ABI (v4-periphery src/MarginRouter.sol); the router's
// position calls are composed server-side, so the client never encodes them and does not carry them.
export const marginRouterAbi = [
  {
    type: 'function',
    name: 'accountOf',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'subId', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
] as const satisfies Abi

export type MarginRouterAbi = typeof marginRouterAbi
