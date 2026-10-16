import { Base58 } from '@ethersproject/basex'
import { isSVMAddress } from 'utilities/src/addresses/svm/svm'

const encodeBytes = (bytes: number[]): string => Base58.encode(Uint8Array.from(bytes))

describe('isSVMAddress', () => {
  it.each`
    input                                             | desc
    ${'11111111111111111111111111111111'}             | ${'System Program (all leading zero bytes, 32 chars)'}
    ${'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'}  | ${'Token Program'}
    ${'SysvarRent111111111111111111111111111111111'}  | ${'SysvarRent'}
    ${'So11111111111111111111111111111111111111112'}  | ${'wrapped SOL mint'}
    ${'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'} | ${'USDC mint'}
    ${'4Nd1mPraZmk6D7new6qR1pT7iEpXD6xzWxMnK46ZQPyW'} | ${'44-char address'}
    ${'9xQeWvG816bUx9EPm2ERmuAHzp3ERWcGy3gPx1bMu7p'}  | ${'43-char address'}
  `('returns true for $desc', ({ input }) => {
    expect(isSVMAddress(input)).toBe(true)
  })

  it.each`
    input                                             | desc
    ${''}                                             | ${'empty string'}
    ${'4Nd1mPraZmk6D7new6qR1pT7'}                     | ${'too short to be 32 bytes'}
    ${'O0O0O0O0O0O0O0O0O0O0O0O0O0O'}                  | ${'characters outside the base58 alphabet'}
    ${'llllllllllllllllllllllllllllllll'}             | ${'l is excluded from base58'}
    ${'IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII'}             | ${'I is excluded from base58'}
    ${'0xf164fC0Ec4E93095b804a4795bBe1e041497b92a'}   | ${'EVM address'}
    ${' 11111111111111111111111111111111 '}           | ${'surrounding whitespace'}
    ${'4Nd1mPraZmk6D7new6qR1pT7iEpXD6xzWxMnK46ZQPy!'} | ${'trailing punctuation'}
  `('returns false for $desc', ({ input }) => {
    expect(isSVMAddress(input)).toBe(false)
  })

  it('rejects base58 strings that decode to the wrong byte count', () => {
    // Both sit inside the permitted character range and length window, so only the decode rejects them.
    expect(isSVMAddress(encodeBytes(new Array(31).fill(9)))).toBe(false)
    expect(isSVMAddress(encodeBytes(new Array(33).fill(9)))).toBe(false)
  })

  it('accepts 32-byte values whose leading zero bytes shorten the encoding', () => {
    expect(isSVMAddress(encodeBytes([0, ...new Array(31).fill(200)]))).toBe(true)
    expect(isSVMAddress(encodeBytes([...new Array(8).fill(0), ...new Array(24).fill(200)]))).toBe(true)
  })
})
