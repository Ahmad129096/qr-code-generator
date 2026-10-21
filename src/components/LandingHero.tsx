import type { LandingPage } from '../landing'

interface Props {
  landing: LandingPage
}

/** The SEO headline block that sits above the generator on every page. */
export default function LandingHero({ landing }: Props) {
  return (
    <section className="landing-hero">
      <h1>{landing.headline}</h1>
      <p className="landing-sub">{landing.sub}</p>
      <ul className="landing-points">
        {landing.highlights.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  )
}
