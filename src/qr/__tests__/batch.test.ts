import { describe, expect, it } from 'vitest'
import {
  BatchParseError,
  generateZip,
  MAX_BATCH_INPUT_CHARACTERS,
  MAX_BATCH_ITEMS,
  MAX_BATCH_VALUE_BYTES,
  parseCsv,
  parseJson,
} from '../batch'
import { defaultOptions } from '../options'

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

  it('keeps newlines inside quoted cells', () => {
    const items = parseCsv('url,label\n"https://x.com/\nmenu","Dinner\nmenu"')
    expect(items).toEqual([{ value: 'https://x.com/\nmenu', label: 'Dinner\nmenu' }])
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

  it('rejects unclosed or malformed quoted fields', () => {
    expect(() => parseCsv('url,label\n"missing close,label')).toThrow(BatchParseError)
    expect(() => parseCsv('url,label\n"closed"x,Label')).toThrow(BatchParseError)
  })

  it('enforces input, item-count, and UTF-8 value limits', () => {
    expect(() => parseCsv('x'.repeat(MAX_BATCH_INPUT_CHARACTERS + 1))).toThrow(/too large/)
    expect(() =>
      parseCsv(`url\n${Array.from({ length: MAX_BATCH_ITEMS + 1 }, () => 'x').join('\n')}`),
    ).toThrow(/at most/)
    expect(() => parseCsv(`url\n${'é'.repeat(Math.ceil(MAX_BATCH_VALUE_BYTES / 2) + 1)}`)).toThrow(
      /UTF-8 bytes/,
    )
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

  it('enforces the same batch and QR value limits', () => {
    expect(() => parseJson(' '.repeat(MAX_BATCH_INPUT_CHARACTERS + 1))).toThrow(/too large/)
    expect(() =>
      parseJson(JSON.stringify(Array.from({ length: MAX_BATCH_ITEMS + 1 }, () => 'x'))),
    ).toThrow(/at most/)
    expect(() => parseJson(JSON.stringify(['é'.repeat(1025)]))).toThrow(/UTF-8 bytes/)
  })
})

describe('generateZip', () => {
  it('returns a partial ZIP and names rows skipped for QR capacity', async () => {
    const progress: [number, number][] = []
    const result = await generateZip(
      [
        { value: 'https://example.com', label: 'valid' },
        { value: 'x'.repeat(1800), label: 'too-long' },
      ],
      { ...defaultOptions(), errorCorrectionLevel: 'H' },
      'svg',
      (done, total) => progress.push([done, total]),
    )

    expect(result.blob.size).toBeGreaterThan(0)
    expect(result.skipped).toEqual(['too-long'])
    expect(progress).toEqual([[1, 2], [2, 2]])
  })

  it('reports skipped labels if no entries fit in a QR code', async () => {
    const oversized = 'x'.repeat(1800)
    await expect(
      generateZip(
        [{ value: oversized, label: 'too-long' }],
        { ...defaultOptions(), errorCorrectionLevel: 'H' },
        'svg',
      ),
    ).rejects.toThrow(/too-long/)
  })

  it('bounds skipped labels shown in the UI', async () => {
    await expect(
      generateZip(
        [{ value: 'x'.repeat(1800), label: 'label-'.repeat(100) }],
        { ...defaultOptions(), errorCorrectionLevel: 'H' },
        'svg',
      ),
    ).rejects.toThrow(/Skipped: label-.{0,55}\.\.\.\./)
  })

  it('rejects requests that bypass parsing limits', async () => {
    const tooMany = Array.from({ length: MAX_BATCH_ITEMS + 1 }, () => ({
      value: 'x',
      label: '',
    }))
    await expect(generateZip(tooMany, defaultOptions(), 'svg')).rejects.toThrow(/at most/)
  })
})
