import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Unicon } from './Unicon.web'

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

describe('web Unicon size channel', () => {
  it('carries size on inline style as well as the attributes', () => {
    const { container } = render(<Unicon address={ADDRESS} size={24} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('24')
    expect(svg?.style.width).toBe('24px')
    expect(svg?.style.height).toBe('24px')
  })

  it('beats a container descendant rule that targets the raw svg', () => {
    const style = document.createElement('style')
    style.textContent = '.icon-slot svg { width: 16.1px; height: 16.1px; }'
    document.head.appendChild(style)
    const { container } = render(
      <div className="icon-slot">
        <Unicon address={ADDRESS} size={24} />
      </div>,
    )
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(getComputedStyle(svg).width).toBe('24px')
    style.remove()
  })
})
