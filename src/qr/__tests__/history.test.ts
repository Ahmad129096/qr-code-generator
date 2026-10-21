import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearHistory,
  loadHistory,
  loadSaved,
  pushHistory,
  removeHistory,
  removeSaved,
  savePreset,
  styleSignature,
  uid,
  type HistoryEntry,
} from '../history'
import { defaultOptions } from '../options'

/** Minimal in-memory localStorage so the module runs in plain Node. */
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

function entry(value: string, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: uid(),
    value,
    options: defaultOptions(),
    thumb: '',
    at: Date.now(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage())
})

describe('history', () => {
  it('starts empty', () => {
    expect(loadHistory()).toEqual([])
  })

  it('pushes new entries to the front', () => {
    pushHistory(entry('a'))
    const list = pushHistory(entry('b'))
    expect(list.map((e) => e.value)).toEqual(['b', 'a'])
    expect(loadHistory()).toHaveLength(2)
  })

  it('de-duplicates by value + style', () => {
    pushHistory(entry('same'))
    const list = pushHistory(entry('same'))
    expect(list).toHaveLength(1)
  })

  it('does not de-duplicate the same value with a different style', () => {
    pushHistory(entry('same'))
    const restyled = entry('same', {
      options: { ...defaultOptions(), fgColor: '#ff0000' },
    })
    expect(pushHistory(restyled)).toHaveLength(2)
  })

  it('caps the stored list at 20 entries', () => {
    for (let i = 0; i < 25; i++) pushHistory(entry(`v${i}`))
    expect(loadHistory()).toHaveLength(20)
    expect(loadHistory()[0]?.value).toBe('v24')
  })

  it('removes a single entry by id and clears the rest', () => {
    const first = entry('a')
    pushHistory(first)
    pushHistory(entry('b'))
    expect(removeHistory(first.id).map((e) => e.value)).toEqual(['b'])
    clearHistory()
    expect(loadHistory()).toEqual([])
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('qrg.history.v1', '{not json')
    expect(loadHistory()).toEqual([])
  })

  it('keeps the content type and fields of an entry', () => {
    pushHistory(entry('WIFI:S:Net;', { typeId: 'wifi', formData: { ssid: 'Net' } }))
    const [first] = loadHistory()
    expect(first?.typeId).toBe('wifi')
    expect(first?.formData).toEqual({ ssid: 'Net' })
  })

  it('de-duplicates by type as well as value and style', () => {
    pushHistory(entry('same', { typeId: 'url' }))
    pushHistory(entry('same', { typeId: 'wifi' }))
    expect(loadHistory()).toHaveLength(2)
  })

  it('restores legacy entries that have no type or fields', () => {
    localStorage.setItem(
      'qrg.history.v1',
      JSON.stringify([{ id: 'a', value: 'legacy', options: { fgColor: '#123456' }, thumb: '', at: 1 }]),
    )
    const [first] = loadHistory()
    expect(first?.value).toBe('legacy')
    expect(first?.typeId).toBeUndefined()
    expect(first?.formData).toBeUndefined()
    // Missing options fall back to the defaults.
    expect(first?.options.fgColor).toBe('#123456')
    expect(first?.options.moduleShape).toBe('square')
  })

  it('drops malformed entries', () => {
    localStorage.setItem(
      'qrg.history.v1',
      JSON.stringify([{ id: 'a' }, 'nope', null, { id: 'b', value: 'ok', options: {} }]),
    )
    const list = loadHistory()
    expect(list).toHaveLength(1)
    expect(list[0]?.value).toBe('ok')
  })
})

describe('styleSignature', () => {
  it('ignores size and print settings', () => {
    const a = defaultOptions()
    const b = { ...defaultOptions(), size: 512, printSizeMm: 80, printMarginMm: 12 }
    expect(styleSignature(a)).toBe(styleSignature(b))
  })

  it('changes when visual style changes', () => {
    const a = defaultOptions()
    expect(styleSignature(a)).not.toBe(styleSignature({ ...a, fgColor: '#123456' }))
    expect(styleSignature(a)).not.toBe(styleSignature({ ...a, moduleShape: 'dot' }))
    expect(styleSignature(a)).not.toBe(styleSignature({ ...a, margin: 0 }))
  })
})

describe('saved presets', () => {
  it('saves, replaces by name, and removes', () => {
    expect(loadSaved()).toEqual([])
    savePreset('Brand', defaultOptions())
    savePreset('Brand', { ...defaultOptions(), fgColor: '#00ff00' })
    const saved = loadSaved()
    expect(saved).toHaveLength(1)
    expect(saved[0]?.options.fgColor).toBe('#00ff00')
    removeSaved(saved[0]!.id)
    expect(loadSaved()).toEqual([])
  })
})

describe('uid', () => {
  it('generates distinct ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()))
    expect(ids.size).toBe(100)
  })
})
