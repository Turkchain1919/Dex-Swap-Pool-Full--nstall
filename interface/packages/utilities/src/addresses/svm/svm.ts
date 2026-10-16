// TODO(chains-migration): move SVM address validation into @universe/chains so its addresses utils
// (packages/chains/src/utilities/addresses.ts) no longer reach back into packages/utilities.
import { Base58 } from '@ethersproject/basex'

const SVM_ADDRESS_LENGTH_BYTES = 32

// Cheap prefilter so obvious non-addresses skip the decode. The lower bound is 32, not 43: each
// leading zero byte encodes as a single '1', so e.g. the System Program ID is 32 '1's.
const SVM_ADDRESS_REGEX = /^[a-zA-Z0-9]{32,44}$/

/**
 * Checks if the given input string is a valid 32-byte base58-encoded string,
 * which is the format used for Solana public keys.
 *
 * @param input - The string to check.
 * @returns True if the input is a valid 32-byte base58 string, false otherwise.
 */
export function isSVMAddress(input: string): boolean {
  if (!SVM_ADDRESS_REGEX.test(input)) {
    return false
  }

  try {
    // The regex permits non-base58 characters (0/O/I/l) and the wrong byte count, so the decode is
    // what actually validates; it throws on an invalid alphabet.
    return Base58.decode(input).length === SVM_ADDRESS_LENGTH_BYTES
  } catch {
    return false
  }
}
