import { REPOSITORY_URL, supportTarget } from '../support'
import { useLocale } from '../localeContext'

/**
 * The footer: what the project is, where the source lives and a small,
 * non-intrusive way to support it.
 */
export default function AppFooter() {
  const { t } = useLocale()
  const support = supportTarget({
    VITE_KOFI_URL: import.meta.env.VITE_KOFI_URL,
    VITE_BUY_ME_A_COFFEE_URL: import.meta.env.VITE_BUY_ME_A_COFFEE_URL,
    VITE_GITHUB_SPONSORS_URL: import.meta.env.VITE_GITHUB_SPONSORS_URL,
  })

  return (
    <footer className="app-footer">
      <p className="footer-note">{t('privacyNote')}</p>
      <nav className="footer-links" aria-label={t('supportProject')}>
        <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
          {t('sourceCode')}
        </a>
        <a
          className="support-link"
          href={support.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Support this project on ${support.provider}`}
        >
          <span aria-hidden="true">♥</span> {t('supportProject')}
        </a>
      </nav>
    </footer>
  )
}
