import { fireEvent, render, screen } from '@testing-library/react'
import TailwindDevTest from 'src/app/components/tailwindDevTest/TailwindDevTest'

describe('TailwindDevTest', () => {
  it('renders the context label and Tailwind token classes', () => {
    render(<TailwindDevTest context="content-script" />)

    const card = screen.getByTestId('tailwind-dev-test-content-script')
    expect(card).toBeTruthy()
    expect(screen.getByText('Tailwind OK — content-script')).toBeTruthy()
    expect(card.querySelector('.bg-surface2')).toBeTruthy()
    expect(card.querySelector('.bg-accent1')).toBeTruthy()
  })

  it('toggles the .dark class wrapper for dark-token verification', () => {
    render(<TailwindDevTest context="content-script" />)

    const card = screen.getByTestId('tailwind-dev-test-content-script')
    expect(card.classList.contains('dark')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle dark' }))
    expect(card.classList.contains('dark')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle light' }))
    expect(card.classList.contains('dark')).toBe(false)
  })
})
