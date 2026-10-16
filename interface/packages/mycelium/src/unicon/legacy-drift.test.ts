/**
 * INFRA-3516 cross-system drift guard: mycelium's Unicon derives
 * legacy-identical avatars only while BOTH sides keep the same icon key
 * order and the same palette slots — the derivation converts a shared hash
 * into an INDEX, so a reorder/rename on either side silently reassigns
 * avatars while every per-side golden still passes. This suite imports both
 * systems and pins them to each other; it goes red on either side's drift.
 *
 * The `ui/src` import is test-only, resolved by this package's vitest alias
 * and tsconfig.test.json — the established mycelium↔ui parity mechanism
 * (tokens.parity.test.ts, ui-icon-assignability.test.ts); mycelium takes no
 * package dependency on ui. The whole file retires with
 * ui/src/components/Unicon (the INFRA-3476 swap path).
 */
import { UNICON_COLORS as LEGACY_UNICON_COLORS } from 'ui/src/components/Unicon/Colors'
import { Icons as LegacyIcons } from 'ui/src/components/Unicon/UniconSVGs'
import { getUniconsDeterministicHash } from 'ui/src/components/Unicon/utils'
import { describe, expect, it } from 'vitest'
import { COLOR_COUNT, UNICON_COLORS } from './colors'
import { deriveUnicon } from './derive'
import { Icons } from './icons'

describe('icon map parity with legacy ui/src UniconSVGs', () => {
  it('has the same keys in the same declaration order (order IS the identity contract)', () => {
    const myceliumKeys = Object.keys(Icons)
    expect(myceliumKeys).toEqual(Object.keys(LegacyIcons))
    expect(myceliumKeys).toHaveLength(74)
  })

  it('has identical path data per key', () => {
    for (const key of Object.keys(Icons)) {
      expect(Icons[key], `glyph '${key}'`).toEqual(LegacyIcons[key])
    }
  })
})

describe('hash-derivation parity with legacy getUniconsDeterministicHash', () => {
  // Not just goldens: this derives through legacy's OWN function at test
  // time, so a change to either side's hashing (or to viem/ethers
  // normalization semantics) goes red here even if both sides' literals
  // were updated in lockstep.
  const ADDRESSES = [
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af',
    // All-lowercase form: both sides must checksum-normalize BEFORE hashing —
    // a pre-checksummed-only fixture set could not falsify that step.
    '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
  ]

  it.each(ADDRESSES)('%s derives the same color and glyph as legacy', (address) => {
    const legacyHash = getUniconsDeterministicHash(address)
    const iconKeys = Object.keys(Icons)
    const derivation = deriveUnicon(address)
    expect(derivation.colorIndex).toBe(Number(legacyHash) % COLOR_COUNT)
    expect(derivation.paths).toBe(Icons[iconKeys[Number(legacyHash) % iconKeys.length] as keyof typeof Icons])
  })
})

describe('palette parity with legacy ui/src Colors', () => {
  it('has the same slot count', () => {
    expect(COLOR_COUNT).toBe(LEGACY_UNICON_COLORS.length)
    expect(UNICON_COLORS.light).toHaveLength(LEGACY_UNICON_COLORS.length)
    expect(UNICON_COLORS.dark).toHaveLength(LEGACY_UNICON_COLORS.length)
  })

  it('matches every light/dark pair slot-for-slot', () => {
    LEGACY_UNICON_COLORS.forEach((pair, index) => {
      expect(UNICON_COLORS.light[index], `light slot ${index}`).toBe(pair[0])
      expect(UNICON_COLORS.dark[index], `dark slot ${index}`).toBe(pair[1])
    })
  })
})
