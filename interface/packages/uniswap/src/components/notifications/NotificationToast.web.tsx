import { Flex, zIndexes } from '@universe/mycelium'
import { SPORE_ANIMATION_CURVE_CSS } from '@universe/tailwind/animations'
import { ReactNode, useMemo } from 'react'
import type { NotificationToastProps } from 'uniswap/src/components/notifications/NotificationToast'
import { NotificationToastContent } from 'uniswap/src/components/notifications/NotificationToastContent'
import { HIDE_OFFSET_Y } from 'uniswap/src/features/notifications/constants'
import { useNotificationLifecycle } from 'uniswap/src/features/notifications/hooks/useNotificationLifecycle'
import { useInjectSingleStylesheet } from 'utilities/src/react/useInjectSingleStylesheet'

const TOAST_ENTER_KEYFRAMES_ID = 'uniswap-toast-enter-keyframes'
const TOAST_ENTER_KEYFRAMES_CSS = `
  @keyframes toast-enter-animation {
    from {
      transform: translateY(${HIDE_OFFSET_Y}px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

// TODO(EXT-931): Consolidate mobile and web animation styles
// Enter-only slide-down on mount (from HIDE_OFFSET_Y / opacity 0), replacing the legacy semiBouncy enter preset.
function WebToastEntryAnimation({ children }: { children: ReactNode }): JSX.Element {
  useInjectSingleStylesheet({ id: TOAST_ENTER_KEYFRAMES_ID, css: TOAST_ENTER_KEYFRAMES_CSS })

  return (
    <Flex
      y={0}
      top="$spacing12"
      left="$spacing12"
      right="$spacing12"
      $platform-web={{ position: 'fixed' }}
      zIndex={zIndexes.toast}
      opacity={1}
      pointerEvents="none"
      style={{ animation: `toast-enter-animation ${SPORE_ANIMATION_CURVE_CSS.semiBouncy}` }}
    >
      {children}
    </Flex>
  )
}

export function NotificationToast({
  subtitle,
  title,
  icon,
  postCaptionElement,
  onPress,
  onPressIn,
  hideDelay,
  actionButton,
  address,
  smallToast,
  contentOverride,
}: NotificationToastProps): JSX.Element {
  const { onActionButtonPress, onNotificationPress, cancelDismiss, dismissLatest } = useNotificationLifecycle({
    actionButtonOnPress: actionButton?.onPress,
    address,
    hideDelay,
    onPress,
  })
  const resolvedContentOverride = useMemo(
    () => (typeof contentOverride === 'function' ? contentOverride({ cancelDismiss, dismissLatest }) : contentOverride),
    [cancelDismiss, contentOverride, dismissLatest],
  )

  const notificationContent = useMemo(
    () => (
      <NotificationToastContent
        title={title}
        subtitle={subtitle}
        icon={icon}
        postCaptionElement={postCaptionElement}
        contentOverride={resolvedContentOverride}
        smallToast={smallToast}
        actionButton={actionButton}
        onPressIn={onPressIn}
        onNotificationPress={onNotificationPress}
        onActionButtonPress={onActionButtonPress}
      />
    ),
    [
      title,
      subtitle,
      icon,
      postCaptionElement,
      resolvedContentOverride,
      smallToast,
      actionButton,
      onPressIn,
      onNotificationPress,
      onActionButtonPress,
    ],
  )

  return <WebToastEntryAnimation>{notificationContent}</WebToastEntryAnimation>
}
