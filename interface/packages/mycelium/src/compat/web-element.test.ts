/**
 * Runtime contract for the migration web-element surface: `assertWebElement`
 * must mirror the legacy `ui/src` util exactly — pass a real div through,
 * throw the same error on anything else — so converted call sites keep their
 * narrowing behavior byte-for-byte.
 */
import { describe, expect, it } from 'vitest'
import { assertWebElement, type MyceliumElement } from './web-element'

describe('assertWebElement', () => {
  it('accepts an HTMLDivElement', () => {
    const div: MyceliumElement = document.createElement('div')
    expect(() => assertWebElement(div)).not.toThrow()
  })

  it('rejects non-div elements and non-elements with the legacy error', () => {
    expect(() => assertWebElement(document.createElement('span'))).toThrow('Element is not an HTMLDivElement')
    expect(() => assertWebElement(null)).toThrow('Element is not an HTMLDivElement')
    expect(() => assertWebElement(undefined)).toThrow('Element is not an HTMLDivElement')
  })

  it('narrows to HTMLDivElement for DOM consumers', () => {
    const element: unknown = document.createElement('div')
    assertWebElement(element)
    // Post-assertion the compiler accepts HTMLDivElement members.
    expect(element.tagName).toBe('DIV')
  })
})
