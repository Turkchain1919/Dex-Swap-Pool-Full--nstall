import type { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { z } from 'zod'

const TypedDataFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
})

const ExternalTypedDataSchema = z.object({
  domain: z.record(z.string(), z.unknown()),
  types: z.record(z.string(), z.array(TypedDataFieldSchema)),
  primaryType: z.string().min(1),
  message: z.record(z.string(), z.unknown()),
})

function getTypesReachableFromPrimaryType({
  types,
  primaryType,
}: {
  types: Record<string, TypedDataField[]>
  primaryType: string
}): Record<string, TypedDataField[]> {
  if (!Object.hasOwn(types, primaryType)) {
    throw new Error(`Typed data primary type "${primaryType}" is not defined`)
  }

  const reachableTypes = new Set<string>()
  const visit = (typeName: string): void => {
    if (reachableTypes.has(typeName)) {
      return
    }

    const fields = types[typeName]
    if (!fields) {
      return
    }

    // Mark before following references so malformed cyclic graphs terminate here and remain for
    // ethers to reject with its normal validation rather than recursing forever in this helper.
    reachableTypes.add(typeName)
    for (const field of fields) {
      const [baseType] = field.type.split('[')
      if (baseType && Object.hasOwn(types, baseType)) {
        visit(baseType)
      }
    }
  }

  visit(primaryType)

  // Preserve the dapp's type ordering while dropping disconnected definitions. EIP-712 signatures
  // are rooted at primaryType, so unused types cannot affect the payload ethers will sign.
  return Object.fromEntries(Object.entries(types).filter(([typeName]) => reachableTypes.has(typeName)))
}

/**
 * Converts every EIP-712 value to the exact JSON representation ethers will sign.
 * The same canonical string can then be used for previewing, scanning, and signing.
 */
export function canonicalizeTypedData(rawTypedData: string): string {
  const parsed = ExternalTypedDataSchema.parse(JSON.parse(rawTypedData))
  const types: Record<string, TypedDataField[]> = { ...parsed.types }

  // ethers derives the domain type itself and rejects it as a competing primary type.
  delete types['EIP712Domain']

  const reachableTypes = getTypesReachableFromPrimaryType({ types, primaryType: parsed.primaryType })
  const payload = _TypedDataEncoder.getPayload(parsed.domain as TypedDataDomain, reachableTypes, parsed.message)

  if (payload.primaryType !== parsed.primaryType) {
    throw new Error(`Typed data primary type resolved to "${payload.primaryType}" instead of "${parsed.primaryType}"`)
  }

  return JSON.stringify(payload)
}
