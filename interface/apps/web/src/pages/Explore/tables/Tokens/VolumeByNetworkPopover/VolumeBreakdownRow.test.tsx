import {
  VolumeBreakdownRow,
  VolumeBreakdownRowLabel,
} from '~/pages/Explore/tables/Tokens/VolumeByNetworkPopover/VolumeBreakdownRow'
import { fireEvent, render, screen } from '~/test-utils/render'

/** The compat layer applies transforms via a var-indirection class; the value rides the inline `--c-tr` property. */
function getTransform(el: HTMLElement): string {
  return el.style.getPropertyValue('--c-tr')
}

describe('VolumeBreakdownRowLabel', () => {
  it('slides to the hover label when isHovered is set', () => {
    const { rerender } = render(
      <VolumeBreakdownRowLabel primaryLabel="$1.2M" hoverLabel="Ethereum" isHovered={false} />,
    )

    // Both labels live in one sliding container; hover translates it up by the slot height (20px).
    const slider = screen.getByText('$1.2M').parentElement
    expect(slider).toBe(screen.getByText('Ethereum').parentElement)
    expect(getTransform(slider as HTMLElement)).toContain('translateY(0px)')

    rerender(<VolumeBreakdownRowLabel primaryLabel="$1.2M" hoverLabel="Ethereum" isHovered />)

    expect(getTransform(screen.getByText('$1.2M').parentElement as HTMLElement)).toContain('translateY(-20px)')
  })
})

describe('VolumeBreakdownRow', () => {
  it('reports hover enter/leave so the parent can drive the label slide', () => {
    const onRowHover = vi.fn()
    const onListSurfaceHover = vi.fn()

    render(
      <VolumeBreakdownRow
        hoveredItemId={null}
        hoverSource={null}
        listSurfaceItemId={null}
        itemId="chain-1"
        onRowHover={onRowHover}
        onListSurfaceHover={onListSurfaceHover}
        onPress={vi.fn()}
      >
        row content
      </VolumeBreakdownRow>,
    )

    const row = screen.getByText('row content')
    fireEvent.mouseEnter(row)
    expect(onRowHover).toHaveBeenLastCalledWith('chain-1')
    expect(onListSurfaceHover).toHaveBeenLastCalledWith('chain-1')

    fireEvent.mouseLeave(row)
    expect(onRowHover).toHaveBeenLastCalledWith(null)
    expect(onListSurfaceHover).toHaveBeenLastCalledWith(null)
  })
})
