import { describe, it, expect } from 'vitest'
import { slugify } from '@backend/team-utils.js'

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Los Pollitos')).toBe('los-pollitos')
  })

  it('removes accents', () => {
    expect(slugify('Equipo Cósmico')).toBe('equipo-cosmico')
  })

  it('removes special characters', () => {
    expect(slugify('Team #1!')).toBe('team-1')
  })

  it('collapses multiple hyphens', () => {
    expect(slugify('a   b')).toBe('a-b')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  hello world  ').trim()).not.toMatch(/^-|-$/)
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('handles single word', () => {
    expect(slugify('Fuego')).toBe('fuego')
  })

  it('preserves numbers', () => {
    expect(slugify('Team 2026')).toBe('team-2026')
  })

  it('handles ampersand (removes it)', () => {
    expect(slugify('Salt & Pepper')).toBe('salt-pepper')
  })
})
