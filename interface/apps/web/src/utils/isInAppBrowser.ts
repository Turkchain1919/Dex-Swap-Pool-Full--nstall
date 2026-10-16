import { isMobileWeb, isSafari, isWebAndroid, isWebIOS } from '@universe/environment'

// Android WebViews add `; wv)`; Chrome for Android does not. iOS has no counterpart token — a
// WKWebView drops the `Safari` product that every standalone iOS browser still sends.
const ANDROID_WEBVIEW_UA = /; wv\)/

/**
 * Whether the page is running inside a native app's embedded browser (Trust Wallet, MetaMask,
 * Telegram, …) rather than a standalone mobile browser.
 *
 * Best-effort: in-app browser chrome is invisible to every viewport unit and to `visualViewport`, so
 * there is nothing to feature-detect and the user agent is the only signal. Gate conservative layout
 * allowances on this; never withhold functionality on it.
 */
export function isInAppBrowser(): boolean {
  if (!isMobileWeb) {
    return false
  }
  if (isWebAndroid) {
    return ANDROID_WEBVIEW_UA.test(navigator.userAgent)
  }
  return isWebIOS && !isSafari
}
