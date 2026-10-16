import type { ReactNode } from 'react'

/**
 * Avatar identity: exactly one of `input` or `address`.
 *
 * `address` is a compat alias for `input` matching the legacy `ui/src` Unicon
 * prop name, so converted call sites swap mechanically. Both spellings feed
 * the same derivation (`deriveUnicon`); passing both, or neither, is a type
 * error.
 */
export type UniconIdentityProps =
  | {
      /** Any string for deterministic avatar generation */
      input: string
      address?: undefined
    }
  | {
      /**
       * Wallet address for deterministic avatar generation — the legacy
       * `ui/src` Unicon prop name, aliasing `input`. Deliberate divergence:
       * for an address legacy rejects, legacy renders null while mycelium
       * always renders the backup avatar; that ruling is pending and
       * INFRA-3476 is the removal condition for this note.
       */
      address: string
      input?: undefined
    }

export interface UniconOwnProps {
  /** Size in pixels (default: 32) */
  size?: number
  /** Additional CSS classes */
  className?: string
  /** Custom icon to render instead of the default generated icon. Will be colored with the computed unicon color. */
  icon?: ReactNode
  /** When true, removes the background circle and scales the shape to fill the full container. */
  bare?: boolean
}

export type UniconProps = UniconOwnProps & UniconIdentityProps
