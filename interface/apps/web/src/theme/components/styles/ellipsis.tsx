// Untyped on purpose: the legacy `TextStyle` re-export is deleted with the tamagui barrel
// cleanup and no compat type carries this `$platform-web` slice; the spread sites typecheck it.
export const EllipsisTamaguiStyle = {
  '$platform-web': {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
} as const
