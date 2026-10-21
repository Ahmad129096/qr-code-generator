import { describe, expect, it } from 'vitest'
import { DEFAULT_SPONSORS_URL, supportTarget } from '../support'

describe('supportTarget', () => {
  it('uses Ko-fi when it is configured', () => {
    expect(
      supportTarget({
        VITE_KOFI_URL: 'https://ko-fi.com/example',
        VITE_BUY_ME_A_COFFEE_URL: 'https://buymeacoffee.com/example',
      }),
    ).toEqual({ url: 'https://ko-fi.com/example', provider: 'Ko-fi' })
  })

  it('falls back to Buy Me a Coffee', () => {
    expect(
      supportTarget({ VITE_BUY_ME_A_COFFEE_URL: 'https://buymeacoffee.com/example' }),
    ).toEqual({ url: 'https://buymeacoffee.com/example', provider: 'Buy Me a Coffee' })
  })

  it('falls back to GitHub Sponsors', () => {
    expect(supportTarget({ VITE_GITHUB_SPONSORS_URL: 'https://github.com/sponsors/example' })).toEqual(
      { url: 'https://github.com/sponsors/example', provider: 'GitHub Sponsors' },
    )
  })

  it('ignores empty values', () => {
    expect(supportTarget({ VITE_KOFI_URL: '   ' }).url).toBe(DEFAULT_SPONSORS_URL)
  })

  it('has a default when nothing is configured', () => {
    expect(supportTarget({})).toEqual({
      url: DEFAULT_SPONSORS_URL,
      provider: 'GitHub Sponsors',
    })
  })
})
