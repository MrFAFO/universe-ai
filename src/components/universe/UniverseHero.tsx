export function UniverseHero() {
  return (
    <section className="universe-hero" aria-label="Universe overview">
      <div className="universe-hero__depth" aria-hidden="true" />

      <div className="universe-hero__image-wrap" aria-hidden="true">
        <img
          className="universe-hero__image"
          src="/images/universe-hero.png"
          alt=""
          width={1920}
          height={640}
          decoding="async"
          fetchPriority="high"
        />
      </div>

      <div className="universe-hero__scrim" aria-hidden="true" />

      <div className="universe-hero__content">
        <p className="universe-hero__welcome">Welcome back,</p>
        <h1 className="universe-hero__name">Galactic Architect</h1>
        <p className="universe-hero__status">Your Universe is evolving.</p>
        <p className="universe-hero__meta">
          26 decisions pending across 4 worlds.
        </p>
      </div>
    </section>
  );
}
