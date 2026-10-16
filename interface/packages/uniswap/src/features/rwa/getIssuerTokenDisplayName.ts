import { formatIssuerLabel } from 'uniswap/src/data/apiClients/dataApiService/rwa/formatIssuerDisplaySymbol'

// Trailing issuer-brand affix shapes seen in on-chain token names. Each pattern splits the name into a stem and
// a brand candidate; the greedy stem anchors the split at the LAST separator ("Coca-Cola • Robinhood Token" →
// "Coca-Cola"). Whether the candidate is the token's own issuer brand is decided in JS, so the patterns stay
// literal (security/detect-non-literal-regexp) and free of nested quantifiers (security/detect-unsafe-regex).
const BRAND_AFFIX_PATTERNS: ReadonlyArray<{ pattern: RegExp; allowTokenWord: boolean }> = [
  // "NVIDIA • Robinhood Token", "NVIDIA · Robinhood", "NVIDIA - Robinhood Token"
  // Separators: bullet (U+2022), middle dot (U+00B7), hyphen, en/em dash, pipe.
  { pattern: /^(.*)[•·\-–—|](.*)$/, allowTokenWord: true },
  // "Tesla (xStocks)", "Tesla (Ondo)"
  { pattern: /^(.*)\((.*)\)$/, allowTokenWord: false },
]
const TRAILING_TOKEN_WORD = /\s+token$/i

function normalizeBrand(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Strips a known issuer-brand affix from an on-chain issuer-token name for display next to an issuer label,
 * e.g. "NVIDIA • Robinhood Token" → "NVIDIA", "Tesla (xStocks)" → "Tesla".
 *
 * Only the token's own issuer brand (slug or display label) is matched, and only as a trailing affix, so an
 * unrecognized name passes through untouched. Display-only: never use the result as a grouping or lookup key.
 */
export function getIssuerTokenDisplayName({ name, issuer }: { name: string; issuer: string }): string {
  const brands = new Set([issuer, formatIssuerLabel(issuer)].map(normalizeBrand).filter(Boolean))
  if (!brands.size) {
    return name
  }
  const trimmedName = name.trim()
  for (const { pattern, allowTokenWord } of BRAND_AFFIX_PATTERNS) {
    const match = pattern.exec(trimmedName)
    if (!match) {
      continue
    }
    const [, stem = '', affix = ''] = match
    const brand = allowTokenWord ? affix.trim().replace(TRAILING_TOKEN_WORD, '') : affix
    const stripped = stem.trim()
    if (stripped && brands.has(normalizeBrand(brand))) {
      return stripped
    }
  }
  return name
}
