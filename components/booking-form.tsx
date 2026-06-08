"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookingPayload,
  BookingSummary,
  CURRENCY_LABEL,
  formatDate,
  getPrice,
  isServiceAvailable,
  isValidPhone,
  PRICES,
  QUARTIERS,
  SERVICES,
  TIME_SLOTS,
  TimeSlot,
  toSummary,
  VEHICLES,
} from "@/lib/booking";

const STEP_LABELS = ["Voiture", "Pack", "Infos"];
const TOTAL_STEPS = STEP_LABELS.length;
const VEHICLE_IMAGES: Record<keyof typeof VEHICLES, string> = {
  citadine: "/assets/vehicles/illustration-citadine.svg",
  berline: "/assets/vehicles/illustration-berline.svg",
  suv_4x4: "/assets/vehicles/illustration-suv-4x4.svg",
  utilitaire: "/assets/vehicles/illustration-utilitaire.svg",
};

type FieldErrors = Partial<Record<keyof BookingPayload | "submit", string>>;

type ApiBookingResponse = {
  booking: BookingSummary;
};

const initialForm: Partial<BookingPayload> = {
  quartier: "",
};

export function BookingForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<BookingPayload>>(initialForm);
  const [customQuartier, setCustomQuartier] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [bookedSlots, setBookedSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalBooking, setFinalBooking] = useState<BookingSummary | null>(null);

  const selectedPrice =
    form.service && form.vehicle ? getPrice(form.service, form.vehicle) : null;

  const recap = useMemo(() => {
    const bookingForm = getBookingForm(form, customQuartier);
    if (!isCompleteBooking(bookingForm)) return null;
    return toSummary(bookingForm);
  }, [customQuartier, form]);

  useEffect(() => {
    if (!form.date) return;

    const controller = new AbortController();
    setIsLoadingSlots(true);

    fetch(`/api/booked-slots?date=${encodeURIComponent(form.date)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("slot fetch failed");
        return (await response.json()) as { booked: TimeSlot[] };
      })
      .then(({ booked }) => {
        setBookedSlots(booked);
        if (form.time && booked.includes(form.time)) {
          setForm((current) => ({ ...current, time: undefined }));
        }
        setErrors((current) => ({ ...current, time: undefined }));
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setBookedSlots([]);
        setErrors((current) => ({
          ...current,
          time: "Impossible de vérifier les créneaux. Réessayez dans quelques secondes.",
        }));
      })
      .finally(() => setIsLoadingSlots(false));

    return () => controller.abort();
  }, [form.date, form.time]);

  function update<K extends keyof BookingPayload>(
    key: K,
    value: BookingPayload[K] | undefined,
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, submit: undefined }));
  }

  function updateQuartier(value: string) {
    update("quartier", value);
    if (value !== "Autre") setCustomQuartier("");
  }

  function updateCustomQuartier(value: string) {
    setCustomQuartier(value);
    setErrors((current) => ({
      ...current,
      quartier: undefined,
      submit: undefined,
    }));
  }

  function selectVehicle(vehicle: BookingPayload["vehicle"]) {
    setForm((current) => ({
      ...current,
      vehicle,
      service:
        current.service && isServiceAvailable(current.service, vehicle)
          ? current.service
          : undefined,
    }));
    setErrors((current) => ({
      ...current,
      vehicle: undefined,
      service: undefined,
      submit: undefined,
    }));
    setStep(2);
  }

  function selectService(service: BookingPayload["service"]) {
    update("service", service);
    setStep(3);
  }

  function goTo(nextStep: number) {
    if (nextStep > step && !validateStep(step)) return;
    setStep(nextStep);
  }

  function canNavigateToStep(nextStep: number) {
    if (nextStep === 1) return true;
    if (nextStep === 2) return Boolean(form.vehicle);
    if (nextStep === 3) return Boolean(form.vehicle && form.service);
    return false;
  }

  function goToProgressStep(nextStep: number) {
    if (!canNavigateToStep(nextStep) || nextStep === step) return;
    setStep(nextStep);
  }

  function validateStep(currentStep: number) {
    const nextErrors: FieldErrors = {};

    if (currentStep === 1 && !form.vehicle) {
      nextErrors.vehicle = "Choisissez un type de voiture";
    }

    if (currentStep === 2 && !form.service) {
      nextErrors.service = "Choisissez un pack";
    }

    if (currentStep === 3) {
      if (!form.firstName?.trim()) {
        nextErrors.firstName = "Veuillez entrer votre prénom";
      }
      if (!form.phone || !isValidPhone(form.phone)) {
        nextErrors.phone = "Entrez un numéro valide (ex : 06 12 34 56 78)";
      }
      if (!form.quartier?.trim()) {
        nextErrors.quartier = "Veuillez choisir un quartier";
      }
      if (form.quartier === "Autre" && !customQuartier.trim()) {
        nextErrors.quartier = "Veuillez entrer votre quartier";
      }
      if (!form.date) nextErrors.date = "Veuillez choisir une date";
      if (!form.time) nextErrors.time = "Veuillez choisir un créneau";
    }

    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  async function submitBooking() {
    if (!validateStep(3) || !recap) return;
    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recap),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; errors?: FieldErrors }
          | null;
        if (payload?.errors) setErrors(payload.errors);
        throw new Error(payload?.error ?? "La réservation n'a pas pu être envoyée");
      }

      const payload = (await response.json()) as ApiBookingResponse;
      setFinalBooking(payload.booking);
      setStep(4);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        submit:
          error instanceof Error
            ? error.message
            : "La réservation n'a pas pu être envoyée",
      }));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 4 && finalBooking) {
    return (
      <section className="booking-flow thank-you" aria-label="Confirmation">
        <div className="check-icon">✓</div>
        <h1 className="step-title">Demande bien reçue</h1>
        <p className="ty-subtitle">
          Voici le récapitulatif de votre demande. Merci de patienter, notre
          équipe vous appellera bientôt pour confirmer le rendez-vous.
        </p>
        <RecapCard booking={finalBooking} />
        <div className="ty-actions">
          <a className="btn btn-outline btn-home" href="/">
            Retour à l'accueil
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="booking-flow" aria-label="Réservation lavage voiture">
      <Progress
        canNavigateToStep={canNavigateToStep}
        onStepSelect={goToProgressStep}
        step={step}
      />

      {step === 1 ? (
        <div className="step-content">
          <StepHeader
            title="Quel type de voiture ?"
            subtitle="Choisissez la forme de votre véhicule"
          />
          <div className="vehicle-grid">
            {typedEntries(VEHICLES).map(([key, vehicle]) => (
              <button
                className={`vehicle-option ${form.vehicle === key ? "selected" : ""}`}
                key={key}
                type="button"
                aria-pressed={form.vehicle === key}
                onClick={() => selectVehicle(key)}
              >
                <div className="vehicle-image-wrap">
                  <img
                    alt=""
                    className="vehicle-image"
                    height="150"
                    loading="lazy"
                    src={VEHICLE_IMAGES[key]}
                    width="260"
                  />
                </div>
                <div className="vehicle-name">{vehicle.label}</div>
                <div className="vehicle-example">{vehicle.example}</div>
              </button>
            ))}
          </div>
          <FieldError message={errors.vehicle} />
          <Reassurance items={["📍 Marrakech", "📞 Confirmation par appel", "💳 Paiement sur place"]} />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="step-content">
          <StepHeader
            title="Quel pack souhaitez-vous ?"
            subtitle={
              form.vehicle
                ? `Prix affichés pour ${VEHICLES[form.vehicle].label}`
                : "Choisissez la formule qui vous convient"
            }
          />
          <div className="option-list">
            {typedEntries(SERVICES).map(([key, service]) => {
              const price = form.vehicle ? PRICES[key][form.vehicle] : service.startPrice;
              const isUnavailable = price === null;

              return (
                <button
                  className={`service-card ${form.service === key ? "selected" : ""}`}
                  disabled={isUnavailable}
                  key={key}
                  type="button"
                  aria-disabled={isUnavailable}
                  aria-pressed={form.service === key}
                  onClick={() => selectService(key)}
                >
                  {"badge" in service && service.badge ? (
                    <span className="badge">{service.badge}</span>
                  ) : null}
                  <h3>
                    <span>
                      {service.icon} {service.label}
                    </span>
                    <span className="price-tag">
                      {isUnavailable ? "Non disponible" : `${price} ${CURRENCY_LABEL}`}
                    </span>
                  </h3>
                  <div className="duration">⏱ {service.duration}</div>
                  <ul className="features">
                    {service.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
          {selectedPrice !== null ? (
            <div className="live-price">
              {VEHICLES[form.vehicle!].label} × {SERVICES[form.service!].label} ={" "}
              {selectedPrice} {CURRENCY_LABEL}
            </div>
          ) : null}
          <FieldError message={errors.service} />
          <div className="nav-buttons">
            <button className="btn btn-outline" type="button" onClick={() => goTo(1)}>
              ←
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="step-content">
          <StepHeader
            title="Vos informations"
            subtitle="Laissez vos coordonnées, on vous appelle pour confirmer"
          />
          <div className="form-group">
            <label htmlFor="firstName">Prénom</label>
            <input
              className={errors.firstName ? "input-error" : ""}
              id="firstName"
              autoComplete="given-name"
              placeholder="Ex : Ahmed"
              value={form.firstName ?? ""}
              onChange={(event) => update("firstName", event.target.value)}
            />
            <FieldError message={errors.firstName} />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Téléphone</label>
            <input
              className={errors.phone ? "input-error" : ""}
              id="phone"
              autoComplete="tel"
              placeholder="06 XX XX XX XX"
              type="tel"
              value={form.phone ?? ""}
              onChange={(event) => update("phone", event.target.value)}
            />
            <FieldError message={errors.phone} />
          </div>
          <div className="form-group">
            <label htmlFor="quartier">Quartier</label>
            <select
              className={errors.quartier ? "input-error" : ""}
              id="quartier"
              value={form.quartier ?? ""}
              onChange={(event) => updateQuartier(event.target.value)}
            >
              <option value="">Choisissez un quartier</option>
              {QUARTIERS.map((quartier) => (
                <option key={quartier} value={quartier}>
                  {quartier}
                </option>
              ))}
            </select>
            {form.quartier === "Autre" ? (
              <input
                aria-label="Votre quartier"
                className={`custom-quartier-input ${
                  errors.quartier ? "input-error" : ""
                }`}
                placeholder="Ex : Sidi Ghanem"
                value={customQuartier}
                onChange={(event) => updateCustomQuartier(event.target.value)}
              />
            ) : null}
            <FieldError message={errors.quartier} />
          </div>
          <div className="datetime-group">
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                className={errors.date ? "input-error" : ""}
                id="date"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={form.date ?? ""}
                onChange={(event) => update("date", event.target.value)}
              />
              <FieldError message={errors.date} />
            </div>
            <div>
              <label>Horaire</label>
              <div className="time-slots">
                {TIME_SLOTS.map((time) => {
                  const isBooked = bookedSlots.includes(time);
                  return (
                    <button
                      className={`time-slot ${form.time === time ? "selected" : ""} ${
                        isBooked ? "booked" : ""
                      }`}
                      key={time}
                      type="button"
                      disabled={isBooked || isLoadingSlots}
                      aria-pressed={form.time === time}
                      onClick={() => update("time", time)}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
              <FieldError message={errors.time} />
            </div>
          </div>

          {recap ? <RecapCard booking={recap} compact /> : null}

          <div className="nav-buttons">
            <button className="btn btn-outline" type="button" onClick={() => goTo(2)}>
              ←
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={isSubmitting || isLoadingSlots}
              onClick={submitBooking}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" /> Envoi en cours...
                </>
              ) : (
                "Envoyer ma demande"
              )}
            </button>
          </div>
          {errors.submit ? <div className="alert">{errors.submit}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

function Progress({
  canNavigateToStep,
  onStepSelect,
  step,
}: {
  canNavigateToStep: (step: number) => boolean;
  onStepSelect: (step: number) => void;
  step: number;
}) {
  return (
    <div className="progress-wrap">
      <div
        className="progress-bar"
        aria-label="Étapes de réservation"
      >
        {STEP_LABELS.map((label, index) => {
          const current = index + 1;
          const isAvailable = canNavigateToStep(current);
          return (
            <button
              aria-label={label}
              aria-current={current === step ? "step" : undefined}
              className={`progress-step ${
                current < step ? "done" : current === step ? "active" : ""
              }`}
              disabled={!isAvailable}
              key={label}
              onClick={() => onStepSelect(current)}
              type="button"
            >
              <span className="progress-number">{current}</span>
              <span className="progress-name">{label}</span>
            </button>
          );
        })}
      </div>
      <div className="step-label">
        Étape {Math.min(step, TOTAL_STEPS)}/{TOTAL_STEPS} —{" "}
        {STEP_LABELS[Math.min(step, TOTAL_STEPS) - 1]}
      </div>
    </div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="step-header">
      <h1 className="step-title">{title}</h1>
      <p className="step-subtitle">{subtitle}</p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return <div className={`field-error ${message ? "show" : ""}`}>{message}</div>;
}

function Reassurance({ items }: { items: string[] }) {
  return (
    <div className="reassurance">
      {items.map((item) => (
        <span className="reassurance-item" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

function RecapCard({
  booking,
  compact,
}: {
  booking: BookingSummary;
  compact?: boolean;
}) {
  return (
    <div
      className="recap-card"
      style={compact ? { marginTop: "1rem" } : undefined}
    >
      <RecapRow label="Voiture" value={VEHICLES[booking.vehicle].label} />
      <RecapRow label="Pack" value={SERVICES[booking.service].label} />
      <RecapRow label="Prénom" value={booking.firstName} />
      <RecapRow label="Téléphone" value={booking.phone} />
      <RecapRow label="Quartier" value={booking.quartier} />
      <RecapRow label="Date" value={formatDate(booking.date)} />
      <RecapRow label="Horaire" value={booking.time} />
      <RecapRow label="Total" value={`${booking.price} ${CURRENCY_LABEL}`} total />
    </div>
  );
}

function RecapRow({
  label,
  value,
  total,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <div className={`recap-row ${total ? "total-row" : ""}`}>
      <span className="recap-label">{label}</span>
      <span className="recap-value">{value}</span>
    </div>
  );
}

function typedEntries<T extends object>(value: T) {
  return Object.entries(value) as {
    [K in keyof T]: [K, T[K]];
  }[keyof T][];
}

function getBookingForm(
  form: Partial<BookingPayload>,
  customQuartier: string,
): Partial<BookingPayload> {
  if (form.quartier !== "Autre") return form;
  return {
    ...form,
    quartier: customQuartier.trim(),
  };
}

function isCompleteBooking(
  value: Partial<BookingPayload>,
): value is BookingPayload {
  return Boolean(
    value.vehicle &&
      value.service &&
      value.firstName &&
      value.phone &&
      value.quartier &&
      value.date &&
      value.time,
  );
}
