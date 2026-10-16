import { ensure0xHex } from '@universe/encoding'
import { Signer, TypedDataDomain, TypedDataField, Wallet } from 'ethers/lib/ethers'

export interface SignsTypedData {
  _signTypedData: Wallet['_signTypedData']
}

function isTypedDataSigner(signer: Signer): signer is Signer & SignsTypedData {
  return '_signTypedData' in signer && typeof signer._signTypedData === 'function'
}

export async function signTypedData({
  domain,
  types,
  value,
  signer,
}: {
  domain: TypedDataDomain
  types: Record<string, TypedDataField[]>
  value: Record<string, unknown>
  signer: Signer
}): Promise<string> {
  if (!isTypedDataSigner(signer)) {
    throw new Error('Incompatible account for signing typed data')
  }

  const signature = await signer._signTypedData(domain, types, value)
  return ensure0xHex(signature)
}
