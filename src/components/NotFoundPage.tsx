import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { QR_TYPES } from '../qrTypes'
import { pathForType } from '../landing'
import { applyNotFoundSeo } from '../seo'

/** Shown for URLs that do not match a landing page. */
export default function NotFoundPage() {
  useEffect(() => {
    applyNotFoundSeo()
  }, [])

  return (
    <main className="app-main single">
      <section className="panel not-found">
        <h1>Page not found</h1>
        <p>That address does not match any QR code type. Pick one below to continue.</p>
        <div className="type-tabs">
          {QR_TYPES.map((type) => (
            <Link key={type.id} to={pathForType(type.id)} className="type-tab">
              <span className="type-icon" aria-hidden="true">
                {type.icon}
              </span>
              {type.label}
            </Link>
          ))}
        </div>
        <p className="not-found-home">
          <Link to="/">Back to the home page</Link>
        </p>
      </section>
    </main>
  )
}
