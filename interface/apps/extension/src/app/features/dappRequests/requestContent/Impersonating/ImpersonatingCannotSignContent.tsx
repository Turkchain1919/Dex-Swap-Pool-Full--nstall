import { Flex, Text } from '@universe/mycelium'
import { AlertTriangleFilled } from '@universe/mycelium/icons/AlertTriangleFilled'
import { impersonatedSigningError } from 'src/app/features/accounts/impersonation'
import { DappRequestContent } from 'src/app/features/dappRequests/DappRequestContent'
import { useDappRequestQueueContext } from 'src/app/features/dappRequests/DappRequestQueueContext'
import { logger } from 'utilities/src/logger/logger'
import { useEvent } from 'utilities/src/react/hooks'

/**
 * Shown instead of the review screen when a dapp asks an impersonated wallet to sign. Rendering the
 * normal screen would imply the request can be approved, which it can't — there is no private key.
 *
 * Strings are deliberately untranslated: this only renders in a dev build.
 */
export function ImpersonatingCannotSignContent(): JSX.Element {
  const { request, onCancel } = useDappRequestQueueContext()

  const onCancelWithImpersonationError = useEvent((): void => {
    if (!request) {
      return
    }
    // Rejected with the impersonation error rather than the default "user rejected", so the dapp's
    // console says why instead of implying the request was declined.
    onCancel(request, impersonatedSigningError()).catch((e: unknown) => {
      // Without this the only button on the screen could fail silently.
      logger.error(e, { tags: { file: 'ImpersonatingCannotSignContent', function: 'onCancel' } })
    })
  })

  return (
    <DappRequestContent title="Can't sign while impersonating" onCancel={onCancelWithImpersonationError}>
      <Flex
        backgroundColor="$statusCritical2"
        borderRadius="$rounded16"
        flexDirection="column"
        gap="$spacing12"
        p="$spacing16"
        position="relative"
        width="100%"
      >
        <Flex flexDirection="row" gap="$gap12">
          <Flex>
            <AlertTriangleFilled color="$statusCritical" size="$icon.20" />
          </Flex>
          <Flex gap="$spacing8" flexShrink={1}>
            <Text color="$statusCritical" variant="buttonLabel3">
              This wallet is impersonated
            </Text>
            <Text color="$neutral2" variant="body4">
              You're viewing the app as this wallet through Developer Settings, so there's no private key to sign with.
              Stop impersonating and switch back to a real wallet to approve requests like this one.
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </DappRequestContent>
  )
}
