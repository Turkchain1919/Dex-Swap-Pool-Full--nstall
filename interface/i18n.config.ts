/**
 * i18n-cli configuration (internal-tools `@uniswap/i18n-cli`).
 *
 * Consumed by `.github/workflows/i18n_generate_translations.yml` (and local
 * runs driven from an internal-tools checkout). The CLI loads this file with
 * a plain bun `import()` and WITHOUT this repo's node_modules installed, so
 * every import reachable from here must be relative and dependency-free —
 * which is why the locale list derives from language/constants.ts (kept
 * pure) rather than duplicating it. Plain object export on purpose: no
 * import of `defineConfig` (an identity function) is needed.
 * scripts/i18n-config.test.ts enforces the import-purity contract.
 */
import { getLocaleTranslationKey, Locale } from './packages/uniswap/src/features/language/constants'

const SOURCE_LOCALE = 'en-US'

export default {
  projectId: 'universe',
  // Brands, tickers and pure-`{{var}}` strings translate to themselves, so
  // every run re-queued them and paid for a translation identical to the
  // source. Requires @uniswap/i18n-cli >= 0.3.0.
  skipUntranslatable: true,
  sources: [
    {
      provider: 'i18next-json',
      source: 'packages/uniswap/src/i18n/locales/source/en-US.json',
      target: 'packages/uniswap/src/i18n/locales/translations/{locale}.json',
      domain: 'product-ui',
    },
  ],
  // Every app Locale resolved to its translation file name (all es-*
  // variants → es-ES, zh-Hans/zh-Hant → zh-CN/zh-TW), deduped, minus the
  // English source. A language is translated iff it has a Locale entry.
  locales: [...new Set(Object.values(Locale).map(getLocaleTranslationKey))]
    .filter((locale) => locale !== SOURCE_LOCALE)
    .sort(),
}
