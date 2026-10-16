/* oxlint-disable eslint-js/no-restricted-syntax */
import { isHexString } from 'ethers/lib/utils'
import { NumberLikeSchema } from 'src/app/features/dappRequests/types/utilityTypes'
import { hexlifyTransaction } from 'utilities/src/transactions/hexlifyTransaction'
import { z } from 'zod'

/**
 * Ethers types copied from `ethers` package
 */

export const BigNumberSchema = z.any() // TODO (EXT-831): Add schema once stable

const AccessListEntrySchema = z.object({
  address: z.string(),
  storageKeys: z.array(z.string()),
})

const AccessListSchema = z.array(AccessListEntrySchema)

// https://docs.ethers.org/v5/api/utils/bignumber/#BigNumberish
const BigNumberishSchema = z.union([
  z.string(),
  z.instanceof(Uint8Array), // For Uint8Array, covering part of BytesLike.
  z.array(z.number().min(0).max(255)), // For byte arrays (part of BytesLike), assuming bytes are represented as numbers 0-255.
  BigNumberSchema,
  z.number(),
  z.bigint(), // For BigInt, in environments that support BigInt.
])

const BytesLikeSchema = z.string().refine((data) => isHexString(data))

// JSON-RPC transaction quantities are 0x-prefixed. Preserve numeric inputs used by Ethers and
// internal callers, but do not reinterpret an unprefixed dapp string as a decimal chain ID.
const DappTransactionChainIdSchema = z.union([
  z.number(),
  z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, 'Transaction chainId must be a 0x-prefixed hexadecimal quantity')
    .transform((value) => Number(value)),
])

// https://docs.ethers.org/v5/api/providers/types/#types--access-lists
const AccessListishSchema = z.union([
  AccessListSchema,
  z.array(z.tuple([z.string(), z.array(z.string())])), // Array of 2-element Arrays format
  z.record(z.string(), z.array(z.string())), // Object with addresses as keys and arrays of storage keys as values
])

export const EthersTransactionRequestSchema = z
  .object({
    to: z.string().optional(),
    from: z.string().optional(),
    nonce: BigNumberishSchema.optional(),
    gasLimit: BigNumberishSchema.optional(),
    gasPrice: BigNumberishSchema.optional(),
    data: BytesLikeSchema.optional(),
    value: BigNumberishSchema.optional(),
    chainId: DappTransactionChainIdSchema.optional(),
    type: NumberLikeSchema.optional(),
    accessList: AccessListishSchema.optional(),
    maxPriorityFeePerGas: BigNumberishSchema.optional(),
    maxFeePerGas: BigNumberishSchema.optional(),
    customData: z.record(z.string(), z.any()).optional(),
    ccipReadEnabled: z.boolean().optional(),
  })
  .transform((transaction, ctx) => {
    try {
      return hexlifyTransaction(transaction)
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'Transaction quantity and data fields must be valid',
      })
      return z.NEVER
    }
  })
