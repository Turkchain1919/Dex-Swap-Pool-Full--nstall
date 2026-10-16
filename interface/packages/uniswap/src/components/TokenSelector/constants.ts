export const ITEM_SECTION_HEADER_ROW_HEIGHT = 40
export const MAX_RECENT_SEARCH_RESULTS = 4
export const MAX_DEFAULT_TRENDING_TOKEN_RESULTS_AMOUNT = 8

/** Loader rows for the selector's loading states. Owned by the token selector because the
 * mobile-web sheet freezes its open height on the laid-out skeleton: 7 rows x the ~64px loader
 * row lands the loading area on prod's open-time measurement (~502px below the search field);
 * tuning this count moves that frozen height. */
export const TOKEN_SELECTOR_LOADING_ROWS = 7
