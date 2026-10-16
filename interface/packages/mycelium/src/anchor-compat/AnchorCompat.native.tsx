/**
 * Native leg of the `Anchor` compat (INFRA-3549): the legacy Tamagui `Anchor`
 * on device is a pressable RN Text — no DOM attrs; pressing calls the user's
 * `onPress` and then `Linking.openURL(href)` when `href` is defined
 * (tamagui `views/Anchor.tsx`). Failures log and never throw (the
 * TouchableTextLink compat's logging posture; legacy left the rejection
 * unhandled).
 *
 * Structure is a deliberate, documented divergence: TextCompat's native leg
 * exposes no press surface (`compat/native-props.ts` forwards no `onPress`),
 * so the press lives on a neutralized `TouchableAreaCompat` frame around the
 * TextCompat — the TouchableTextLink compat's framed mechanism. A frame (a
 * real Yoga node) rather than a nested-RN-Text press wrapper, because nested
 * Text demotes its children to inline text fragments and would silently drop
 * the anchor-as-row layouts real call sites use
 * (`MaybeExplorerLinkedAddress.tsx` passes `flexDirection`/`gap`).
 *
 * Because the frame — not the Text — is the element the real parent lays out
 * and the element screen readers act on, the split routes the parent-facing
 * surface to the frame and keeps the content-facing surface on the Text:
 * - PARENT-FACING → frame: the flex-item props (`flex`/`alignSelf`/…),
 *   sizing, margins, positioning, `display` (the TouchableTextLink display
 *   precedent), and the actionable-node identity — `testID` and
 *   `accessibilityRole` (default `link`, legacy put it on the pressable
 *   itself; the frame's native leg announces `accessibilityRole`, not
 *   `role`, so both are set).
 * - CONTENT-FACING → Text: typography, padding/visuals (they hug the padded
 *   content box, exactly where legacy paints them), the children-layout
 *   props (`flexDirection`/`gap`/`alignItems`/…, which lay out the anchor's
 *   CHILDREN and the Text is the children's container), `style`, and the
 *   media/pseudo pools. A pool carrying a parent-facing entry
 *   (`$md={{ flex: 1 }}`) stays on the Text — a known bound of the split; no
 *   audited call site does this (INFRA-3549 audit).
 * - `aria-label`/`accessibilityLabel` DELIBERATELY stay on the Text:
 *   TouchableAreaCompat's native leg is a curated allow-list that forwards
 *   no label surface, so routing them to the frame would silently void them;
 *   on the Text they reach assistive tech through the Pressable's default
 *   accessibility grouping (an accessible container announces its
 *   descendants' labels). Full one-node cohesion needs TouchableAreaCompat
 *   to grow label forwarding — tracked as a follow-up on INFRA-3549.
 *
 * `tag`/`target`/`rel` are accepted so the shared prop contract is identical
 * across legs, and unused exactly as legacy leaves them unused on device.
 */
import { createConsoleLogger } from '@universe/logger'
import * as React from 'react'
import { type GestureResponderEvent, Linking, type Text } from 'react-native'
import { useEvent } from 'utilities/src/react/hooks'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import { TextCompat } from '../text-compat/TextCompat'
import type { TouchableAreaCompatProps } from '../touchable-area/props'
import { TouchableAreaCompat } from '../touchable-area/TouchableAreaCompat'
import type { AnchorCompatProps } from './props'

const logger = createConsoleLogger('AnchorCompat')

/**
 * The parent-facing surface routed to the frame (see the header): layout plus
 * the actionable-node identity. Every name exists on both `AnchorCompatProps`
 * and `TouchableAreaCompatProps`; the pin lives in the anchor native-parity
 * suite's routing layer.
 */
const FRAME_LAYOUT_PROP_KEYS = [
  // flex-item props: resolve against the REAL parent, so they must sit on
  // the element that parent lays out
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  // sizing (percentages resolve against the real parent, not the frame)
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  // margins: the parent-facing box edge
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  // positioning: resolves against the real containing block / siblings
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  // display: hides/participates as the parent-facing box (TouchableTextLink precedent)
  'display',
  // actionable-node identity: the frame is the pressable node tests target
  // and assistive tech acts on, and its native leg forwards exactly these
  // two to the Pressable host (TouchableAreaCompat.native.tsx render) — the
  // label props are deliberately NOT here, see the header
  'testID',
  'accessibilityRole',
] as const

function splitFrameLayoutProps(props: Record<string, unknown>): {
  frame: Record<string, unknown>
  text: Record<string, unknown>
} {
  const frame: Record<string, unknown> = {}
  const text: Record<string, unknown> = { ...props }
  for (const key of FRAME_LAYOUT_PROP_KEYS) {
    if (text[key] !== undefined) {
      frame[key] = text[key]
      delete text[key]
    }
  }
  return { frame, text }
}

export const AnchorCompat = React.forwardRef<Text, AnchorCompatProps>(function AnchorCompat(props, ref) {
  const { tag: _tag, href, target: _target, rel: _rel, onPress, role, ...rest } = props
  const { frame: frameProps, text: textProps } = splitFrameLayoutProps(rest)

  // The shared contract types the press family with DOM events; on native the
  // same handlers receive gesture-responder events, exactly like the legacy
  // component's RN typing (the TouchableAreaCompat.native mechanism).
  const handlePressWithLink = useEvent((event: GestureResponderEvent): void => {
    ;(onPress as ((pressEvent: GestureResponderEvent) => void) | null | undefined)?.(event)
    if (href !== undefined) {
      Linking.openURL(href).catch((error: unknown) => {
        logger.error('failed to open link', error, { href })
      })
    }
  })

  return (
    <TouchableAreaCompat
      variant="unstyled"
      // The frame is press plumbing plus the parent-facing box: no press
      // feedback (unstyled scale 1, identity press opacity), no propagation
      // gating, no child color injection — legacy renders a bare pressable
      // Text, not the TouchableArea wrapper.
      scaleTo={1}
      activeOpacity={1}
      shouldStopPropagation={false}
      shouldAutomaticallyInjectColors={false}
      // The pressable is the element assistive tech acts on — the legacy
      // `accessibilityRole: 'link'` sat on the pressable Text itself. The
      // frame's native leg announces `accessibilityRole` (it forwards no
      // `role`), so the default is set on BOTH forms; a caller-supplied
      // `accessibilityRole` wins through the frameProps spread below.
      role={role ?? 'link'}
      accessibilityRole="link"
      onPress={handlePressWithLink}
      // SAFETY: every routed key exists on TouchableAreaCompatProps with a
      // compatible value type except Text's wider `display` union (its
      // `inline-block` member has no RN rendering on either component); the
      // routing pin in the native parity suite covers the runtime contract.
      {...(frameProps as Partial<TouchableAreaCompatProps>)}
    >
      <TextCompat
        // tsc resolves only TextCompat's platformless base (web) leg —
        // `moduleSuffixes` is configured nowhere — so the RN Text ref crosses
        // the leg boundary with a cast; at runtime Metro resolves
        // TextCompat.native, whose ref IS an RN Text (platform-legs.test.ts).
        ref={ref as unknown as React.Ref<HTMLElement>}
        {...(textProps as AnchorCompatProps)}
      />
    </TouchableAreaCompat>
  )
})
// Marks the outermost forwardRef object so legacy TouchableArea's WithInjectedColors
// skips it instead of injecting color/backgroundColor (INFRA-3823).
markMyceliumPrimitive(AnchorCompat)
