import { BookingForm } from "@/components/booking-form";

export default function Home() {
  return (
    <>
      <main className="page-shell">
        <section className="booking-hero" aria-label="Atlas Lavage">
          <div className="brand-lockup" aria-label="ATLAS LAVAGE">
            <img
              alt="Atlas Lavage"
              className="brand-logo-image"
              height="118"
              src="/assets/atlas-lavage-logo.png"
              width="118"
            />
          </div>
          <p className="hero-kicker">Lavage auto à domicile - Marrakech</p>
          <h1>Réservez un lavage premium pour votre voiture</h1>
          <p className="hero-copy">
            Une expérience rapide, soignée et professionnelle, avec confirmation
            par appel et paiement sur place.
          </p>
        </section>

        <section className="booking-panel" aria-label="Formulaire de réservation">
          <BookingForm />
        </section>
      </main>
      <footer>© 2026 Atlas Lavage — Tous droits réservés</footer>
    </>
  );
}
