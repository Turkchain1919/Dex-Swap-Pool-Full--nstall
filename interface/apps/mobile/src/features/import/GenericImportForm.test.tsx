import React from 'react'
import { GenericImportForm } from 'src/features/import/GenericImportForm'
import { fireEvent, render, screen } from 'src/test/test-utils'
import { noOpFunction } from 'utilities/src/test/utils'
import { AppPortalProvider } from 'wallet/src/providers/portal-provider'

describe(GenericImportForm, () => {
  it('renders a placeholder when there is no value', async () => {
    const tree = render(
      <AppPortalProvider>
        <GenericImportForm
          errorMessage={undefined}
          placeholderLabel="seed phrase"
          value={undefined}
          onChange={noOpFunction}
        />
      </AppPortalProvider>,
    )

    expect(await screen.findByText('seed phrase')).toBeDefined()
    expect(tree.toJSON()).toMatchSnapshot()
  })

  it('renders a value', async () => {
    render(
      <AppPortalProvider>
        <GenericImportForm
          errorMessage={undefined}
          placeholderLabel="seed phrase"
          value="hello"
          onChange={noOpFunction}
        />
      </AppPortalProvider>,
    )

    expect(await screen.queryByText('seed phrase')).toBeNull()
    expect(await screen.findByDisplayValue('hello')).toBeDefined()
  })

  it('renders an error message', async () => {
    render(
      <AppPortalProvider>
        <GenericImportForm
          errorMessage="there is an error"
          placeholderLabel="seed phrase"
          value="wrong value"
          onChange={noOpFunction}
        />
      </AppPortalProvider>,
    )

    // In jsdom the autofocused input starts focused, which hides the error; blur to show it
    // (on device the error also only shows when the input isn't focused)
    fireEvent(await screen.findByDisplayValue('wrong value'), 'blur')

    expect(await screen.findByText('there is an error')).toBeDefined()
  })
})
