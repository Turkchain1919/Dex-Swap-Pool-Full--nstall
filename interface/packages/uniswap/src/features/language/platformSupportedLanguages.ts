import { isWebApp } from '@universe/environment'
import { WALLET_SUPPORTED_LANGUAGES, WEB_SUPPORTED_LANGUAGES } from 'uniswap/src/features/language/constants'

// Lives outside constants.ts so that file stays dependency-free — it is
// imported by the repo-root i18n.config.ts, which the external i18n-cli
// loads without node_modules installed.
export const PLATFORM_SUPPORTED_LANGUAGES = isWebApp ? WEB_SUPPORTED_LANGUAGES : WALLET_SUPPORTED_LANGUAGES
