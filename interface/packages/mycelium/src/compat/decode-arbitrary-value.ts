/**
 * Decode a Tailwind arbitrary value back to CSS: `_` means space (the
 * compilers' `arbitrary()` escaping), except inside dashed idents
 * (`var(--stext-chain_1)` keeps its underscore), inside `url(…)` (real
 * Tailwind preserves it there — `url(a_b.png)` is a literal URL), and the
 * explicit `\_` escape — exactly like Tailwind's own decoder.
 *
 * Extracted from inline-style.ts (round 5) to keep that module under the
 * oxlint max-lines cap.
 */
export function decodeArbitraryValue(value: string): string {
  let out = ''
  let identDepth = 0
  let urlDepth = 0
  for (let i = 0; i < value.length; i++) {
    const ch = value[i] as string
    if (ch === '\\' && value[i + 1] === '_') {
      out += '_'
      i++
      continue
    }
    if (urlDepth > 0) {
      if (ch === ')') {
        urlDepth--
      }
      out += ch
      continue
    }
    if (/[uU]/.test(ch) && /^url\(/i.test(value.slice(i, i + 4))) {
      urlDepth = 1
      out += value.slice(i, i + 4)
      i += 3
      continue
    }
    if (ch === '-' && value[i + 1] === '-') {
      identDepth = 1 // entering a dashed ident: keep underscores until a non-ident char
    } else if (identDepth === 1 && !/[\w-]/.test(ch)) {
      identDepth = 0
    }
    out += ch === '_' && identDepth === 0 ? ' ' : ch
  }
  return out
}
