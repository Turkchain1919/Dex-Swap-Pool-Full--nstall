import type { GraphQLApi } from '@universe/api'

// The card only needs chain + address to defer-fetch its own CurrencyInfo on hover (symbol/project
// are read as a pre-fetch fallback) — narrower than GraphQLApi.Token so callers building a
// minimal token don't need to fabricate the rest of the type with a cast.
export type TokenHoverCardToken = Pick<GraphQLApi.Token, 'chain' | 'address'> &
  Partial<Pick<GraphQLApi.Token, 'symbol' | 'project'>>
