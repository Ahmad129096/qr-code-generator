import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { LOCALES, LOCALE_NAMES, type Locale } from '../locale'
import { useLocale } from '../localeContext'

export default function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])

  useEffect(() => {
    if (!open) return
    menuRef.current
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.focus()
  }, [open])

  function closeMenu(restoreFocus = false) {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu(true)
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const options = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="group"] button') ?? [],
    )
    const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement)
    if (currentIndex < 0 || options.length === 0) return

    event.preventDefault()
    const nextIndex =
      (currentIndex + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length
    options[nextIndex]?.focus()
  }

  return (
    <div
      className={`locale-switcher${open ? ' is-open' : ''}`}
      ref={switcherRef}
      onKeyDown={handleMenuKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        className="locale-switcher-trigger"
        type="button"
        ref={triggerRef}
        aria-label={`${t('language')}: ${LOCALE_NAMES[locale]}`}
        aria-expanded={open}
        aria-controls="locale-switcher-menu"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <svg
          className="locale-switcher-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3.5 12h17M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
        </svg>
        <span className="locale-switcher-label">{t('language')}</span>
        <span className="locale-current">{locale.toUpperCase()}</span>
        <svg
          className="locale-chevron"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="m2.5 4.5 3.5 3 3.5-3" />
        </svg>
      </button>
      {open && (
        <div
          className="locale-menu"
          id="locale-switcher-menu"
          ref={menuRef}
          role="group"
          aria-label={t('language')}
        >
          {LOCALES.map((option) => {
            const selected = option === locale
            return (
              <button
                key={option}
                className={`locale-menu-option${selected ? ' active' : ''}`}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setLocale(option)
                  closeMenu(true)
                }}
              >
                <span className="locale-option-code">{option.toUpperCase()}</span>
                <span className="locale-option-name" lang={option}>
                  {LOCALE_NAMES[option]}
                </span>
                <svg
                  className="locale-option-check"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="m3.5 8 3 3 6-6" />
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
