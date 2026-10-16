/**
 * The WEB IconButton icon slot vs `createIcon`'s inline-style defaults — the
 * `../button-compat/web-icon-slot.test.tsx` contract on the OTHER slot.
 *
 * `ThemedIconCompat` styles children via descendant CSS on the wrapper span
 * (`[&_svg]:size-*` + text color), but a `createIcon` glyph carries its own
 * size/color defaults on inline style, which wins. A glyph that bakes a
 * `defaultFill` therefore renders that literal hex through every theme —
 * invisible in dark mode when the hex is near-black, as `QrCode`'s `#131313`
 * is against the Receive-crypto account row.
 *
 * The two slots share one clone helper today, so the colour cell is pinned
 * here rather than left to the Button lane's coverage: nothing else stops a
 * per-slot split from dropping it on this lane alone.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ICON_BUTTON_ICON_SIZE_PX } from '../button-frame-compat/compile'
import type { ButtonSize } from '../button-frame-compat/compile'
import { resolveIconColor } from '../compat/icon-props'
import { CopySheets } from '../components/icons/CopySheets'
import { QrCode } from '../components/icons/QrCode'
import { IconButtonCompat } from './IconButtonCompat.web'

/** The inline style react-dom serialized onto the first `<svg>` in the markup. */
function svgStyleOf(markup: string): string {
  const match = /<svg[^>]*style="([^"]*)"/.exec(markup)
  return match?.[1] ?? ''
}

/** `QrCode`'s baked fill, as an independent literal — the value that must never reach the svg. */
const QR_CODE_BAKED_FILL = '#131313'

describe('IconButtonCompat web icon slot × createIcon inline defaults', () => {
  it('a defaultFill glyph inherits the button text color instead of its baked hex', () => {
    // Positive control: standalone, the glyph really does bake a concrete fill in,
    // so the assertion below is testing the slot rather than a glyph without one.
    expect(svgStyleOf(renderToStaticMarkup(<QrCode />))).toContain(`color:${QR_CODE_BAKED_FILL}`)

    const style = svgStyleOf(
      renderToStaticMarkup(<IconButtonCompat emphasis="secondary" size="xxsmall" icon={<QrCode />} />),
    )
    expect(style).toContain('color:currentColor')
    expect(style).not.toContain(QR_CODE_BAKED_FILL)
  })

  it('a glyph with no defaultFill inherits the same way', () => {
    const style = svgStyleOf(
      renderToStaticMarkup(<IconButtonCompat emphasis="secondary" size="xxsmall" icon={<CopySheets />} />),
    )
    expect(style).toContain('color:currentColor')
  })

  it.each(['xxsmall', 'small', 'medium'] as ButtonSize[])('%s: the glyph takes the icon lane box, not 8px', (size) => {
    const style = svgStyleOf(renderToStaticMarkup(<IconButtonCompat size={size} icon={<QrCode />} />))
    expect(style).toContain(`width:${ICON_BUTTON_ICON_SIZE_PX[size]}px`)
    expect(style).toContain(`height:${ICON_BUTTON_ICON_SIZE_PX[size]}px`)
    // The createIcon default that used to win.
    expect(style).not.toContain('width:8px')
  })

  it('an explicit glyph color wins over the slot (all-legs contract)', () => {
    const style = svgStyleOf(renderToStaticMarkup(<IconButtonCompat icon={<QrCode color="$accent1" />} />))
    expect(style).toContain(`color:${resolveIconColor('$accent1')}`)
    expect(style).not.toContain('currentColor')
  })
})
