import { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { pwaNotices, type PwaNotice } from '../pwa'
import { useLocale } from '../localeContext'

/** The event Chromium fires when the app can be installed. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** iOS Safari has no install prompt — the user adds the app by hand. */
function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  return isIos && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

/** True when the app already runs as an installed app. */
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

/**
 * Small, unobtrusive notices about the PWA: a new version to reload, the
 * offline state, the "works offline now" hint and the install button.
 */
export default function PwaNotices() {
  const { t } = useLocale()
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [online, setOnline] = useState(() => navigator.onLine)
  const [installDismissed, setInstallDismissed] = useState(false)
  // iOS never fires the install prompt, so offer the manual steps instead.
  const [iosHint] = useState(() => isIosSafari() && !isStandalone())

  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error) => {
      console.warn('[pwa] the service worker could not be registered', error)
    },
  })

  // The "works offline" hint disappears on its own after a few seconds.
  useEffect(() => {
    if (!offlineReady) return
    const timer = window.setTimeout(() => setOfflineReady(false), 6000)
    return () => window.clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  // Remember the install prompt so the button can show it later.
  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const install = useCallback(async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setInstallEvent(null)
  }, [installEvent])

  const notices = pwaNotices({
    needRefresh,
    offlineReady,
    installAvailable: installEvent !== null || iosHint,
    installed,
    online,
  })
  if (notices.length === 0) return null

  return (
    <div className="pwa-notices" role="status" aria-live="polite">
      {notices.map((notice: PwaNotice) => (
        <div key={notice} className="pwa-notice">
          {notice === 'update' && (
            <>
              <span>{t('updateReady')}</span>
              <button type="button" className="pwa-notice-action" onClick={() => void updateServiceWorker(true)}>
                {t('reload')}
              </button>
            </>
          )}

          {notice === 'offline' && (
            <span className="pwa-notice-warn">
              {t('offlineMessage')}
            </span>
          )}

          {notice === 'offline-ready' && <span>{t('offlineReady')}</span>}

          {notice === 'install' && !installDismissed && (
            <>
              {installEvent ? (
                <>
                  <span>{t('installMessage')}</span>
                  <button type="button" className="pwa-notice-action" onClick={() => void install()}>
                    {t('install')}
                  </button>
                </>
              ) : (
                <span>{t('iosInstall')}</span>
              )}
              <button
                type="button"
                className="pwa-notice-dismiss"
                onClick={() => setInstallDismissed(true)}
                aria-label={t('dismissInstall')}
              >
                ×
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
