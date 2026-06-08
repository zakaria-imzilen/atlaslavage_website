import { BookingForm } from "@/components/booking-form";

const SUPPORT_WHATSAPP_FALLBACK = "+212612345678";

function getSupportWhatsappUrl() {
  const phoneNumber =
    process.env.WHATSAPP_NUMBER ?? SUPPORT_WHATSAPP_FALLBACK;
  const normalized = phoneNumber.replace(/[^\d]/g, "");
  const message = encodeURIComponent(
    "Bonjour Atlas Lavage, j'ai besoin d'aide avec ma réservation.",
  );

  return `https://wa.me/${normalized}?text=${message}`;
}

export default function Home() {
  const supportWhatsappUrl = getSupportWhatsappUrl();

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
      <footer className="site-footer">
        <span>© 2026 Atlas Lavage — Tous droits réservés</span>
        <a
          className="footer-whatsapp"
          href={supportWhatsappUrl}
          rel="noreferrer"
          target="_blank"
        >
          Support WhatsApp
        </a>
      </footer>
    </>
  );
}
