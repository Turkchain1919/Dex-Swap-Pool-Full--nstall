import '~/components/Loader/Loader.css'
import { styled, type StyledComponent } from '@universe/mycelium/styled'
import type { ComponentPropsWithoutRef } from 'react'

const LOADING_ROWS_VARIANTS = {} as const

export const LoadingRows: StyledComponent<'div', typeof LOADING_ROWS_VARIANTS> = styled('div', {
  platform: 'web',
  variants: LOADING_ROWS_VARIANTS,
  base: 'grid web-loading-rows',
})

const LoadingRowFrame = styled('div', {
  platform: 'web',
  base: 'web-shimmer rounded-[12px]',
})

export function LoadingRow({
  height,
  width,
  style,
  ...rest
}: { height: number; width: number } & ComponentPropsWithoutRef<typeof LoadingRowFrame>): JSX.Element {
  return <LoadingRowFrame style={{ height, width, ...style }} {...rest} />
}

const LOADING_OPACITY_VARIANTS = {
  $loading: {
    true: '[filter:grayscale(1)] opacity-60 transition-none',
    false: '[filter:none] opacity-100 [transition:opacity_250ms_ease-in-out]',
  },
} as const

export const LoadingOpacityContainer: StyledComponent<'div', typeof LOADING_OPACITY_VARIANTS> = styled('div', {
  platform: 'web',
  variants: LOADING_OPACITY_VARIANTS,
})

const LOADING_FULLSCREEN_VARIANTS = {} as const

export const LoadingFullscreen: StyledComponent<'div', typeof LOADING_FULLSCREEN_VARIANTS> = styled('div', {
  platform: 'web',
  variants: LOADING_FULLSCREEN_VARIANTS,
  base: 'web-shimmer inset-0 absolute',
})
