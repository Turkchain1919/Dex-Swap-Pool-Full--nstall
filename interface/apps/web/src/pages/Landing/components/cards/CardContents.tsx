import { styled } from '@universe/mycelium/styled'

// Class universe parity-pinned against the legacy styled(Flex) config in
// packages/tailwind/src/parity/styled-factory (buildCardContents); the
// overlapping $xxl/$lg opacity branches keep Tamagui's narrower-wins order
// (media-lg rules are emitted after media-xxl in the compiled sheet).
export const CardContents = styled('div', {
  platform: 'web',
  base: 'flex flex-col items-stretch basis-auto box-border relative min-h-[0px] min-w-[0px] shrink-0 absolute w-full h-full flex-row-reverse items-center top-0 right-0 bottom-0 opacity-[1] media-xxl:opacity-[0.2] media-lg:opacity-[0]',
})
