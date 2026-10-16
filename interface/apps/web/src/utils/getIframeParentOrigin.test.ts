import {
  getIframeParentOrigin,
  getIframeParentOriginUserProperty,
  IFRAME_PARENT_ORIGIN_NONE,
  IFRAME_PARENT_ORIGIN_UNKNOWN,
} from '~/utils/getIframeParentOrigin'

const originals = {
  location: Object.getOwnPropertyDescriptor(window, 'location'),
  self: Object.getOwnPropertyDescriptor(window, 'self'),
  top: Object.getOwnPropertyDescriptor(window, 'top'),
  referrer: Object.getOwnPropertyDescriptor(document, 'referrer'),
}

function restore(target: object, key: string, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor)
  } else {
    Reflect.deleteProperty(target, key)
  }
}

// Every case sets the full framed state it needs and nothing leaks into the next one.
afterEach(() => {
  restore(window, 'location', originals.location)
  restore(window, 'self', originals.self)
  restore(window, 'top', originals.top)
  restore(document, 'referrer', originals.referrer)
})

function setWindow({
  ancestorOrigins,
  self = 'https://app.uniswap.org',
  top = 'https://app.uniswap.org',
  referrer = '',
}: {
  /** Pass `'throws'` to make any access to `ancestorOrigins` throw, as a cross-origin frame does. */
  ancestorOrigins: unknown
  self?: unknown
  top?: unknown
  referrer?: string
}): void {
  const location =
    ancestorOrigins === 'throws'
      ? {
          get ancestorOrigins(): never {
            throw new Error('cross-origin')
          },
          origin: 'https://app.uniswap.org',
        }
      : { ancestorOrigins, origin: 'https://app.uniswap.org' }
  Object.defineProperty(window, 'location', { value: location, writable: true, configurable: true })
  Object.defineProperty(window, 'self', { value: self, writable: true, configurable: true })
  Object.defineProperty(window, 'top', { value: top, writable: true, configurable: true })
  Object.defineProperty(document, 'referrer', { value: referrer, configurable: true })
}

describe('getIframeParentOrigin', () => {
  it('returns the immediate parent origin from ancestorOrigins, preferring it over the referrer', () => {
    setWindow({
      ancestorOrigins: ['https://dexscreener.com', 'https://outer.example'],
      top: 'https://dexscreener.com',
      referrer: 'https://www.dexscreener.com/ethereum/0xabc',
    })
    expect(getIframeParentOrigin()).toBe('https://dexscreener.com')
  })

  it('returns undefined when the embedder suppressed its referrer, even though ancestorOrigins names it', () => {
    setWindow({ ancestorOrigins: ['https://dexscreener.com'], top: 'https://dexscreener.com', referrer: '' })
    expect(getIframeParentOrigin()).toBeUndefined()
  })

  it('falls back to the referrer origin only, without path or query, when ancestorOrigins is unsupported', () => {
    setWindow({
      ancestorOrigins: undefined,
      top: 'https://app.safe.global',
      referrer: 'https://app.safe.global/apps/open?safe=eth:0x123&appUrl=https%3A%2F%2Fapp.uniswap.org',
    })
    expect(getIframeParentOrigin()).toBe('https://app.safe.global')
  })

  it('returns undefined when not framed', () => {
    setWindow({ ancestorOrigins: [], referrer: 'https://www.google.com/' })
    expect(getIframeParentOrigin()).toBeUndefined()
  })

  it('returns undefined when framed but no parent origin is available', () => {
    setWindow({ ancestorOrigins: undefined, top: 'https://unknown.example', referrer: '' })
    expect(getIframeParentOrigin()).toBeUndefined()
  })

  it('returns undefined when the referrer is our own origin (in-frame navigation)', () => {
    setWindow({
      ancestorOrigins: undefined,
      top: 'https://unknown.example',
      referrer: 'https://app.uniswap.org/swap?chain=base',
    })
    expect(getIframeParentOrigin()).toBeUndefined()
  })

  it('returns undefined when the referrer does not parse', () => {
    setWindow({ ancestorOrigins: undefined, top: 'https://unknown.example', referrer: 'not a url' })
    expect(getIframeParentOrigin()).toBeUndefined()
  })

  it('returns undefined when cross-origin access throws', () => {
    setWindow({ ancestorOrigins: 'throws', top: 'https://dexscreener.com', referrer: 'https://dexscreener.com/' })
    expect(getIframeParentOrigin()).toBeUndefined()
  })

  it('treats an opaque "null" ancestor origin as unresolvable and falls back to the referrer', () => {
    setWindow({
      ancestorOrigins: ['null'],
      top: 'https://sandboxed.example',
      referrer: 'https://sandboxed.example/embed',
    })
    expect(getIframeParentOrigin()).toBe('https://sandboxed.example')
  })

  it('returns undefined when the ancestor origin is opaque and there is no usable referrer', () => {
    setWindow({ ancestorOrigins: ['null'], top: 'https://sandboxed.example', referrer: '' })
    expect(getIframeParentOrigin()).toBeUndefined()
  })
})

describe('getIframeParentOriginUserProperty', () => {
  it('returns the parent origin when framed and resolvable', () => {
    setWindow({
      ancestorOrigins: ['https://dexscreener.com'],
      top: 'https://dexscreener.com',
      referrer: 'https://dexscreener.com/',
    })
    expect(getIframeParentOriginUserProperty()).toBe('https://dexscreener.com')
  })

  it('returns the "unknown" sentinel when the embedder suppressed its referrer', () => {
    setWindow({ ancestorOrigins: ['https://dexscreener.com'], top: 'https://dexscreener.com', referrer: '' })
    expect(getIframeParentOriginUserProperty()).toBe(IFRAME_PARENT_ORIGIN_UNKNOWN)
  })

  it('returns the "none" sentinel when not framed, even with a referrer', () => {
    setWindow({ ancestorOrigins: [], referrer: 'https://www.google.com/' })
    expect(getIframeParentOriginUserProperty()).toBe(IFRAME_PARENT_ORIGIN_NONE)
  })

  it('returns the "unknown" sentinel when framed but no parent origin is available', () => {
    setWindow({ ancestorOrigins: undefined, top: 'https://unknown.example', referrer: '' })
    expect(getIframeParentOriginUserProperty()).toBe(IFRAME_PARENT_ORIGIN_UNKNOWN)
  })

  it('returns the "unknown" sentinel when cross-origin access throws', () => {
    setWindow({ ancestorOrigins: 'throws', top: 'https://dexscreener.com', referrer: 'https://dexscreener.com/' })
    expect(getIframeParentOriginUserProperty()).toBe(IFRAME_PARENT_ORIGIN_UNKNOWN)
  })

  it('returns the "unknown" sentinel for an opaque "null" ancestor origin with no usable referrer', () => {
    setWindow({ ancestorOrigins: ['null'], top: 'https://sandboxed.example', referrer: '' })
    expect(getIframeParentOriginUserProperty()).toBe(IFRAME_PARENT_ORIGIN_UNKNOWN)
  })
})
