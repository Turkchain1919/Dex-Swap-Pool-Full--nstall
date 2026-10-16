import type { Abi } from 'viem'

// Minimal Permit2 (AllowanceTransfer) surface used by the margin equity path:
// read the current allowance and grant a spender allowance. Full Permit2 ABI lives
// in uniswap/src/abis/permit2 for the signature-based swap flows.
export const permit2Abi = [
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'spender', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: 'amount', type: 'uint160', internalType: 'uint160' },
      { name: 'expiration', type: 'uint48', internalType: 'uint48' },
      { name: 'nonce', type: 'uint48', internalType: 'uint48' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint160', internalType: 'uint160' },
      { name: 'expiration', type: 'uint48', internalType: 'uint48' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi

export type Permit2Abi = typeof permit2Abi
