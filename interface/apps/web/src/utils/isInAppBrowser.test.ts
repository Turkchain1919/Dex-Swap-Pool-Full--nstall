import { isInAppBrowser } from '~/utils/isInAppBrowser'

const env = vi.hoisted(() => ({
  isMobileWeb: false,
  isSafari: false,
  isWebAndroid: false,
  isWebIOS: false,
}))

vi.mock('@universe/environment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/environment')>()
  return {
    ...actual,
    get isMobileWeb() {
      return env.isMobileWeb
    },
    get isSafari() {
      return env.isSafari
    },
    get isWebAndroid() {
      return env.isWebAndroid
    },
    get isWebIOS() {
      return env.isWebIOS
    },
  }
})

interface Case {
  readonly userAgent: string
  readonly env: typeof env
  readonly expected: boolean
}

// Real user agents, each paired with the platform flags a real device reports alongside it. Deriving
// the flags from the string would re-implement @universe/environment's parsing inside the fixture.
const CASES: ReadonlyArray<readonly [string, Case]> = [
  [
    'an Android WebView (Trust Wallet, MetaMask, …)',
    {
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; SM-G991B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36',
      env: { isMobileWeb: true, isSafari: true, isWebAndroid: true, isWebIOS: false },
      expected: true,
    },
  ],
  [
    'an iOS in-app browser (WKWebView, no Safari product token)',
    {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      env: { isMobileWeb: true, isSafari: false, isWebAndroid: false, isWebIOS: true },
      expected: true,
    },
  ],
  [
    'mobile Safari on iOS',
    {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      env: { isMobileWeb: true, isSafari: true, isWebAndroid: false, isWebIOS: true },
      expected: false,
    },
  ],
  [
    // CriOS/FxiOS are ordinary standalone browsers, so they must not get the in-app allowance. They
    // reach the iOS leg with `isSafari` true because they still send a `Safari/<version>` token and
    // @universe/environment tests the user agent for `Safari` rather than identifying the browser.
    'Chrome on iOS (CriOS)',
    {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
      env: { isMobileWeb: true, isSafari: true, isWebAndroid: false, isWebIOS: true },
      expected: false,
    },
  ],
  [
    'Firefox on iOS (FxiOS)',
    {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/126.0 Mobile/15E148 Safari/605.1.15',
      env: { isMobileWeb: true, isSafari: true, isWebAndroid: false, isWebIOS: true },
      expected: false,
    },
  ],
  [
    'Chrome for Android',
    {
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      env: { isMobileWeb: true, isSafari: true, isWebAndroid: true, isWebIOS: false },
      expected: false,
    },
  ],
  [
    'desktop Chrome',
    {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      env: { isMobileWeb: false, isSafari: true, isWebAndroid: false, isWebIOS: false },
      expected: false,
    },
  ],
]

function setUserAgent(userAgent: string): void {
  // defineProperty, not assignment: `Navigator.userAgent` is a readonly accessor.
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true })
}

function applyCase({ userAgent, env: flags }: Case): void {
  setUserAgent(userAgent)
  Object.assign(env, flags)
}

describe('isInAppBrowser', () => {
  const originalUserAgent = navigator.userAgent

  afterEach(() => {
    setUserAgent(originalUserAgent)
  })

  it.each(CASES)('classifies %s', (_name, testCase) => {
    applyCase(testCase)
    expect(isInAppBrowser()).toBe(testCase.expected)
  })

  it('needs the Android WebView token, not the bare letters "wv"', () => {
    applyCase({
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; wv-1000 Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      env: { isMobileWeb: true, isSafari: true, isWebAndroid: true, isWebIOS: false },
      expected: false,
    })
    expect(isInAppBrowser()).toBe(false)
  })

  // iPadOS 13+ sends a desktop-class Mac user agent, so an iPad in-app browser reads as desktop here.
  it('leaves a desktop-classified session alone even when the iOS and Safari signals point in-app', () => {
    applyCase({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      env: { isMobileWeb: false, isSafari: false, isWebAndroid: false, isWebIOS: true },
      expected: false,
    })
    expect(isInAppBrowser()).toBe(false)
  })
})
