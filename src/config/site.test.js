import { describe, expect, it } from 'vitest'
import { siteConfig } from './site.js'

describe('public site configuration', () => {
  it('uses the official Timer Studio URLs', () => {
    expect(siteConfig.url).toBe('https://timer.bilalabdulhadi.com')
    expect(siteConfig.repositoryUrl).toBe('https://github.com/bilalabdulhadii/react-timer-studio')
    expect(siteConfig.developerUrl).toBe('https://bilalabdulhadi.com')
  })
})
