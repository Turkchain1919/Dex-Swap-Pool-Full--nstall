// Drop-in for the legacy flexStyles presets — value-identical plain style objects, platform-free.
export const flexStyles = {
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  shrink: { flexShrink: 1 },
} as const
