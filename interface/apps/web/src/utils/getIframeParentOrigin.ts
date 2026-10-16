import { isIFramed } from '~/utils/isIFramed'

/**
 * Origin of the immediate parent frame, or undefined when not framed, unknown, or the embedder
 * withheld its referrer. Origin only — never the parent URL/path, which is why `new URL(...).origin` is used.
 */
export function getIframeParentOrigin(): string | undefined {
  if (!isIFramed()) {
    return undefined
  }
  try {
    // An embedder that suppresses its referrer (referrerpolicy="no-referrer") has asked not to be
    // identified; respect that even though Chromium still populates ancestorOrigins in that case.
    if (!document.referrer) {
      return undefined
    }
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    const ancestorOrigin = window.location.ancestorOrigins?.[0]
    if (isResolvableOrigin(ancestorOrigin)) {
      return ancestorOrigin
    }
    // Firefox has no ancestorOrigins; on initial load the referrer is the embedding document,
    // but after an in-frame navigation it is our own previous page, which is not a parent.
    const referrerOrigin = new URL(document.referrer).origin
    return isResolvableOrigin(referrerOrigin) && referrerOrigin !== window.location.origin ? referrerOrigin : undefined
  } catch {
    return undefined
  }
}

// An opaque origin (sandboxed frame without allow-same-origin, data:/file: parent) serializes
// to the literal string 'null', which is truthy but names no embedder.
function isResolvableOrigin(origin: string | undefined): origin is string {
  return Boolean(origin) && origin !== 'null'
}

/** `iframe_parent_origin` value when the document is not framed. */
export const IFRAME_PARENT_ORIGIN_NONE = 'none'
/** `iframe_parent_origin` value when framed but the parent origin cannot be resolved. */
export const IFRAME_PARENT_ORIGIN_UNKNOWN = 'unknown'

/**
 * `iframe_parent_origin` user property. Always a string so the property is written on every
 * load and never carries a stale origin from an earlier framed load; the two sentinels keep
 * "not framed" and "framed but unresolvable" distinguishable.
 */
export function getIframeParentOriginUserProperty(): string {
  if (!isIFramed()) {
    return IFRAME_PARENT_ORIGIN_NONE
  }
  return getIframeParentOrigin() ?? IFRAME_PARENT_ORIGIN_UNKNOWN
}
