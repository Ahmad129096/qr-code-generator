import type { HistoryEntry } from '../qr/history'
import { clearHistory, removeHistory } from '../qr/history'
import { QR_TYPES } from '../qrTypes'
import { useLocale } from '../localeContext'

interface Props {
  entries: HistoryEntry[]
  onChange: (entries: HistoryEntry[]) => void
  onRestore: (entry: HistoryEntry) => void
}

function timeAgo(at: number): string {
  const s = Math.round((Date.now() - at) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}

function typeLabel(typeId?: string): string | undefined {
  if (!typeId) return undefined
  return QR_TYPES.find((t) => t.id === typeId)?.label
}

export default function HistoryPanel({ entries, onChange, onRestore }: Props) {
  const { t } = useLocale()
  if (entries.length === 0) {
    return (
      <section className="panel history-panel">
        <h2>{t('history')}</h2>
        <p className="history-empty">{t('historyEmpty')}</p>
      </section>
    )
  }

  return (
    <section className="panel history-panel">
      <div className="history-head">
        <h2>{t('history')}</h2>
        <button type="button" className="link-btn" onClick={() => onChange(clearAll())}>
          {t('clearAll')}
        </button>
      </div>
      <ul className="history-list">
        {entries.map((entry) => {
          const label = typeLabel(entry.typeId)
          return (
            <li key={entry.id} className="history-item">
              <button
                type="button"
                className="history-main"
                onClick={() => onRestore(entry)}
                title={t('restoreCode')}
              >
                <span className="history-thumb">
                  {entry.thumb ? (
                    <img src={entry.thumb} alt="" />
                  ) : (
                    <span className="thumb-ph">QR</span>
                  )}
                </span>
                <span className="history-meta">
                  <span className="history-value">{entry.value}</span>
                  <span className="history-time">
                    {label ? `${label} · ` : ''}
                    {timeAgo(entry.at)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="history-remove"
                aria-label={t('removeHistory')}
                onClick={() => onChange(removeHistory(entry.id))}
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function clearAll(): HistoryEntry[] {
  clearHistory()
  return []
}
