import { Anchor, type AnchorProps } from '@universe/mycelium'
import { SPORE_ANIMATION_CURVE_CSS } from '@universe/tailwind/animations'
import { useCallback } from 'react'
import { InterfaceEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { anonymizeLink } from '~/utils/anonymizeLink'

function outboundLink({ label }: { label: string }) {
  sendAnalyticsEvent(InterfaceEventName.ExternalLinkClicked, {
    label,
  })
}

function StyledLink({ hoverStyle, pressStyle, style, ...props }: AnchorProps): JSX.Element {
  return (
    <Anchor
      cursor="pointer"
      textDecorationLine="none"
      color="$accent1"
      fontWeight="$medium"
      hoverStyle={{ opacity: 0.6, ...hoverStyle }}
      pressStyle={{ opacity: 0.4, ...pressStyle }}
      // Hand-written, not `animation`/`animateOnly`: those are on the compat type surface but emit
      // no transition, so reaching for them typechecks and silently drops the fade. Scoped to
      // opacity — an unscoped transition animates theme-token colors on light/dark toggle.
      style={{ transition: `opacity ${SPORE_ANIMATION_CURVE_CSS.fast}`, ...style }}
      {...props}
    />
  )
}

type StyledLinkProps = AnchorProps
type LinkPressEvent = Parameters<NonNullable<StyledLinkProps['onPress']>>[0]

function hasGetModifierState(
  event: LinkPressEvent,
): event is LinkPressEvent & { getModifierState: (key: string) => boolean } {
  return 'getModifierState' in event && typeof event.getModifierState === 'function'
}

function isModifiedClick(event: LinkPressEvent): boolean {
  if (hasGetModifierState(event)) {
    return event.getModifierState('Control') || event.getModifierState('Meta')
  }
  return false
}

function handleClickExternalLink(event: LinkPressEvent, { href, target }: { href?: string; target?: string }): void {
  if (!href) {
    return
  }

  const anonymizedHref = anonymizeLink(href)

  // don't prevent default, don't redirect if it's a new tab
  if (target === '_blank' || isModifiedClick(event)) {
    outboundLink({ label: anonymizedHref })
  } else {
    event.preventDefault()
    // send a ReactGA event and then trigger a location change
    outboundLink({ label: anonymizedHref })
  }
}

export type ExternalLinkProps = StyledLinkProps & {
  /** Merged with outbound telemetry (DOM / legacy callers). */
  onClick?: (event: LinkPressEvent) => void
}

/**
 * Outbound link that handles firing google analytics events
 */
export function ExternalLink({
  target = '_blank',
  href,
  rel = 'noopener noreferrer',
  onClick,
  onPress,
  ...rest
}: ExternalLinkProps) {
  const handlePress = useCallback(
    (event: LinkPressEvent) => {
      handleClickExternalLink(event, { href, target })
      onClick?.(event)
      onPress?.(event)
    },
    [href, target, onClick, onPress],
  )
  return <StyledLink href={href} rel={rel} target={target} {...rest} onPress={handlePress} />
}
