import { describe, expect, it } from 'vitest'
import { flexCompatClassName, flexCompatEmission } from '../flex-compat/compile'
import { clickableStyle } from './clickable'

describe('clickableStyle', () => {
  it('carries every clickable affordance through the Flex class composition', () => {
    const className = flexCompatClassName({ ...clickableStyle })
    expect(className).toContain('[cursor:pointer]')
    expect(className).toContain('hover:opacity-[0.8]')
    expect(className).toContain('active:opacity-[0.6]')
    expect(className).toContain('no-underline')
  })

  it('compiles through the deterministic-emission path without throwing', () => {
    const { className } = flexCompatEmission({ ...clickableStyle })
    expect(className).toContain('no-underline')
  })

  it('scopes the transition to opacity — a bare duration would mean `all` and animate theme-token colors', () => {
    expect(clickableStyle.style.transition).toMatch(/^opacity /)
  })
})
