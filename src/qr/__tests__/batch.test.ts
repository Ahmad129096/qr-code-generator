import { describe, expect, it } from 'vitest'
import { BatchParseError, parseCsv, parseJson } from '../batch'

describe('parseCsv', () => {
  it('detects a header row and maps value/label columns', () => {
    const items = parseCsv('url,label\nhttps://a.com, Alpha\nhttps://b.com, Beta')
    expect(items).toEqual([
      { value: 'https://a.com', label: 'Alpha' },
      { value: 'https://b.com', label: 'Beta' },
    ])
  })

  it('honours quoted cells containing commas and escaped quotes', () => {
    const items = parseCsv('value,label\n"https://x.com/a,b","Bob ""The Builder"""')
    expect(items).toEqual([{ value: 'https://x.com/a,b', label: 'Bob "The Builder"' }])
  })

  it('handles CRLF line endings', () => {
    const items = parseCsv('url,label\r\nhttps://a.com,One\r\nhttps://b.com,Two\r\n')
    expect(items).toHaveLength(2)
    expect(items[1]?.label).toBe('Two')
  })

  it('falls back to positional columns without a header', () => {
    const items = parseCsv('https://a.com, First\nhttps://b.com')
    expect(items).toEqual([
      { value: 'https://a.com', label: 'First' },
      { value: 'https://b.com', label: '' },
    ])
  })

  it('skips blank lines and rows without a value', () => {
    const items = parseCsv('url\nhttps://a.com\n\n   \nhttps://b.com')
    expect(items.map((i) => i.value)).toEqual(['https://a.com', 'https://b.com'])
  })

  it('accepts any recognized value column name', () => {
    for (const key of ['value', 'data', 'content', 'text', 'url', 'link', 'payload']) {
      expect(parseCsv(`${key}\nx`)).toEqual([{ value: 'x', label: '' }])
    }
  })

  it('throws on empty input', () => {
    expect(() => parseCsv('')).toThrow(BatchParseError)
    expect(() => parseCsv('\n  \n')).toThrow(BatchParseError)
  })
})

describe('parseJson', () => {
  it('accepts a bare array of strings', () => {
    expect(parseJson('["https://a.com", "https://b.com"]')).toEqual([
      { value: 'https://a.com', label: '' },
      { value: 'https://b.com', label: '' },
    ])
  })

  it('accepts objects with value/label fields', () => {
    const items = parseJson('[{"url":"https://a.com","name":"Alpha"}]')
    expect(items).toEqual([{ value: 'https://a.com', label: 'Alpha' }])
  })

  it('accepts an { items: [...] } wrapper', () => {
    expect(parseJson('{"items":["x"]}')).toEqual([{ value: 'x', label: '' }])
  })

  it('skips entries without a usable value', () => {
    expect(parseJson('[{"label":"no value"}, "", "ok"]')).toEqual([{ value: 'ok', label: '' }])
  })

  it('throws on invalid JSON or a non-array payload', () => {
    expect(() => parseJson('{oops')).toThrow(BatchParseError)
    expect(() => parseJson('{"foo":1}')).toThrow(BatchParseError)
    expect(() => parseJson('[]')).toThrow(BatchParseError)
  })
})
