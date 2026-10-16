/**
 * The conditional `data-testid` spread shared by every compat web leg
 * (INFRA-3677): spread the result (`{...domTestId(testID)}`) conditional and
 * LAST, after any forwarded/ambient props.
 *
 * Both halves of that placement are load-bearing:
 *  - an explicit `testID` must beat an ambient `data-testid` arriving through
 *    a forwarded spread (the legacy RN prop is the compat contract's source of
 *    truth, INFRA-3222);
 *  - an absent `testID` must contribute NO key at all — an explicit
 *    `'data-testid': undefined` written after a spread (or passed in a
 *    `cloneElement` config, where `undefined` config values still override)
 *    wipes the ambient attribute instead of leaving it alone.
 */
export function domTestId(testID: string | undefined): { 'data-testid': string } | undefined {
  return testID === undefined ? undefined : { 'data-testid': testID }
}
