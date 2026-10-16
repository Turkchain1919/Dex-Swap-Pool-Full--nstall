import { useMedia } from '@universe/mycelium/theme-hooks-compat'

export function useIsMobile(): boolean {
  const media = useMedia()
  return media.md
}
