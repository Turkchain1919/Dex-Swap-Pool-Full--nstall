import { Flex } from '@universe/mycelium'
import { useState } from 'react'

export interface TailwindDevTestProps {
  /** Which extension context this instance is rendered in (shown in the card + testid). */
  context: 'content-script'
}

/**
 * Dev-only proof that the Tailwind stylesheet (@universe/tailwind tokens) is
 * delivered into this extension context. Exercises theme color tokens,
 * typography utilities, and the `.dark` class variant.
 *
 * Only mounted by the dev-only content-script entrypoint — the one context with
 * no real mycelium usage yet. The HTML page contexts (sidepanel, popup,
 * onboarding, unitag claim) proved delivery via this card and now render real
 * mycelium components, so their mounts were removed.
 */
export default function TailwindDevTest({ context }: TailwindDevTestProps): JSX.Element {
  const [isDark, setIsDark] = useState(false)

  const toggleDark = (): void => setIsDark((prev) => !prev)

  return (
    <Flex
      flexDirection="row"
      justifyContent="flex-start"
      className={isDark ? 'dark' : undefined}
      data-testid={`tailwind-dev-test-${context}`}
    >
      <Flex
        justifyContent="flex-start"
        flexDirection="column"
        gap="$gap8"
        className="fixed bottom-2 right-2 z-50 rounded-lg border border-surface3 bg-surface2 p-3 shadow-md dark:shadow-none"
      >
        <Flex flexDirection="row" justifyContent="flex-start" alignItems="center" gap="$gap8">
          <Flex flexDirection="row" justifyContent="flex-start" className="size-2 rounded-full bg-accent1" />
          <span className="font-basel text-body-3 text-neutral1">Tailwind OK — {context}</span>
        </Flex>
        <button
          type="button"
          className="cursor-pointer rounded-md bg-surface3 px-2 py-1 text-body-4 text-neutral2"
          onClick={toggleDark}
        >
          Toggle {isDark ? 'light' : 'dark'}
        </button>
      </Flex>
    </Flex>
  )
}
