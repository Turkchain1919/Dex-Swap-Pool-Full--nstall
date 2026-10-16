import { getIssuerTokenDisplayName } from 'uniswap/src/features/rwa/getIssuerTokenDisplayName'

describe('getIssuerTokenDisplayName', () => {
  it('strips a trailing "• <Brand> Token" suffix (U+2022)', () => {
    expect(getIssuerTokenDisplayName({ name: 'NVIDIA • Robinhood Token', issuer: 'robinhood' })).toBe('NVIDIA')
    expect(getIssuerTokenDisplayName({ name: 'SpaceX • Robinhood Token', issuer: 'robinhood' })).toBe('SpaceX')
  })

  it('keeps punctuation in the company name ahead of the suffix', () => {
    expect(
      getIssuerTokenDisplayName({
        name: 'Trump Media & Technology Group Corp. • Robinhood Token',
        issuer: 'robinhood',
      }),
    ).toBe('Trump Media & Technology Group Corp.')
    expect(getIssuerTokenDisplayName({ name: 'Coca-Cola • Robinhood Token', issuer: 'robinhood' })).toBe('Coca-Cola')
  })

  it('tolerates a middle dot (U+00B7), hyphen, dashes and irregular whitespace', () => {
    expect(getIssuerTokenDisplayName({ name: 'NVIDIA · Robinhood Token', issuer: 'robinhood' })).toBe('NVIDIA')
    expect(getIssuerTokenDisplayName({ name: 'NVIDIA - Robinhood Token', issuer: 'robinhood' })).toBe('NVIDIA')
    expect(getIssuerTokenDisplayName({ name: 'NVIDIA — Robinhood Token', issuer: 'robinhood' })).toBe('NVIDIA')
    expect(getIssuerTokenDisplayName({ name: 'NVIDIA  •  robinhood token ', issuer: 'robinhood' })).toBe('NVIDIA')
  })

  it('strips a trailing brand without the "Token" word', () => {
    expect(getIssuerTokenDisplayName({ name: 'NVIDIA • Robinhood', issuer: 'robinhood' })).toBe('NVIDIA')
  })

  it('strips a trailing "(<Brand>)" parenthetical using the issuer display label', () => {
    expect(getIssuerTokenDisplayName({ name: 'Tesla (xStocks)', issuer: 'xstocks' })).toBe('Tesla')
    expect(getIssuerTokenDisplayName({ name: 'Tesla (Ondo)', issuer: 'ondo' })).toBe('Tesla')
  })

  it('only strips the affix of the token’s own issuer', () => {
    expect(getIssuerTokenDisplayName({ name: 'NVIDIA • Robinhood Token', issuer: 'ondo' })).toBe(
      'NVIDIA • Robinhood Token',
    )
  })

  it('returns names without a known affix unchanged', () => {
    expect(getIssuerTokenDisplayName({ name: 'NVIDIA', issuer: 'robinhood' })).toBe('NVIDIA')
    expect(getIssuerTokenDisplayName({ name: 'Ondo Tokenized Tesla', issuer: 'ondo' })).toBe('Ondo Tokenized Tesla')
    expect(getIssuerTokenDisplayName({ name: 'Gold • Vault Token', issuer: 'robinhood' })).toBe('Gold • Vault Token')
  })

  it('returns the original when stripping would leave nothing or the issuer is empty', () => {
    expect(getIssuerTokenDisplayName({ name: '• Robinhood Token', issuer: 'robinhood' })).toBe('• Robinhood Token')
    expect(getIssuerTokenDisplayName({ name: 'NVIDIA • Robinhood Token', issuer: '' })).toBe('NVIDIA • Robinhood Token')
  })
})
