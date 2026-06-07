export const BUSINESS_NAME = "Atlas Lavage";
export const CURRENCY_LABEL = "DHS";

export const SERVICES = {
  express: {
    label: "Expresse",
    icon: "⏱",
    startPrice: 49,
    duration: "20-30 min",
    badge: "Rapide",
    features: [
      "Lavage extérieur",
      "Nettoyage jantes",
      "Vitres",
      "Séchage microfibre",
    ],
  },
  classique: {
    label: "Classique",
    icon: "⏱",
    startPrice: 79,
    duration: "45-60 min",
    badge: "Populaire",
    features: [
      "Tout Expresse inclus",
      "Nettoyage intérieur complet",
      "Tableau de bord",
      "Tapis",
      "Parfum",
    ],
  },
  premium: {
    label: "Premium",
    icon: "🏆",
    startPrice: 159,
    duration: "1h30 - 2h",
    features: [
      "Tout Classique inclus",
      "Shampooing sièges & moquette",
      "Cire carrosserie",
      "Nettoyage jantes profond",
      "Parfum longue durée",
    ],
  },
} as const;

export const VEHICLES = {
  citadine: {
    label: "Citadine",
    icon: "🚗",
    example: "Clio, i10, Picanto",
  },
  berline: {
    label: "Berline",
    icon: "🚘",
    example: "Dacia Logan, Golf, Classe C",
  },
  suv_4x4: {
    label: "SUV 4x4",
    icon: "🚙",
    example: "Duster, Tucson, RAV4, 4x4",
  },
  utilitaire: {
    label: "Utilitaire",
    icon: "🚐",
    example: "Kangoo, Partner, fourgon",
  },
} as const;

export const PRICES = {
  express: { citadine: 49, berline: 59, suv_4x4: 69, utilitaire: 79 },
  classique: { citadine: 79, berline: 99, suv_4x4: 119, utilitaire: 150 },
  premium: { citadine: 159, berline: 179, suv_4x4: 199, utilitaire: null },
} as const;

export const QUARTIERS = [
  "Guéliz",
  "Hivernage",
  "Majorelle",
  "Targa",
  "Semlalia",
  "Hay Riad",
  "Massira",
  "Autre",
] as const;

export const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
] as const;

export type ServiceKey = keyof typeof SERVICES;
export type VehicleKey = keyof typeof VEHICLES;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export type BookingPayload = {
  vehicle: VehicleKey;
  service: ServiceKey;
  firstName: string;
  phone: string;
  quartier: string;
  date: string;
  time: TimeSlot;
};

export type BookingSummary = BookingPayload & {
  id?: string;
  price: number;
};

export function getPrice(service: ServiceKey, vehicle: VehicleKey) {
  return PRICES[service][vehicle];
}

export function isServiceAvailable(service: ServiceKey, vehicle: VehicleKey) {
  return getPrice(service, vehicle) !== null;
}

export function formatDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function cleanPhone(phone: string) {
  return phone.replace(/[\s-]/g, "");
}

export function isValidPhone(phone: string) {
  return /^(0[5-7]\d{8}|\+212[5-7]\d{8})$/.test(cleanPhone(phone));
}

export function isService(value: unknown): value is ServiceKey {
  return typeof value === "string" && value in SERVICES;
}

export function isVehicle(value: unknown): value is VehicleKey {
  return typeof value === "string" && value in VEHICLES;
}

export function isTimeSlot(value: unknown): value is TimeSlot {
  return typeof value === "string" && TIME_SLOTS.includes(value as TimeSlot);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateBookingPayload(input: unknown) {
  const data = input as Partial<BookingPayload>;
  const errors: Record<string, string> = {};

  if (!isVehicle(data.vehicle)) errors.vehicle = "Choisissez un type de voiture";
  if (!isService(data.service)) errors.service = "Choisissez un pack";
  if (
    isVehicle(data.vehicle) &&
    isService(data.service) &&
    !isServiceAvailable(data.service, data.vehicle)
  ) {
    errors.service = "Ce pack n'est pas disponible pour ce véhicule";
  }
  if (!data.firstName?.trim()) errors.firstName = "Veuillez entrer votre prénom";
  if (!data.phone || !isValidPhone(data.phone)) {
    errors.phone = "Entrez un numéro valide";
  }
  if (!data.quartier?.trim()) errors.quartier = "Veuillez choisir un quartier";
  if (!isIsoDate(data.date)) errors.date = "Veuillez choisir une date";
  if (!isTimeSlot(data.time)) errors.time = "Veuillez choisir un créneau";

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
    data: {
      vehicle: data.vehicle!,
      service: data.service!,
      firstName: data.firstName!.trim(),
      phone: data.phone!.trim(),
      quartier: data.quartier!.trim(),
      date: data.date!,
      time: data.time!,
    },
  };
}

export function toSummary(payload: BookingPayload): BookingSummary {
  return {
    ...payload,
    price: getPrice(payload.service, payload.vehicle) ?? 0,
  };
}

export function buildWhatsappMessage(summary: BookingSummary) {
  return `Bonjour ${BUSINESS_NAME} 👋

Je souhaite confirmer ma réservation :

🧽 Service : ${SERVICES[summary.service].label}
🚗 Voiture : ${VEHICLES[summary.vehicle].label}
📍 Quartier : ${summary.quartier}
📅 Date : ${formatDate(summary.date)}
🕐 Heure : ${summary.time}
👤 Prénom : ${summary.firstName}
📱 Tél : ${summary.phone}
💰 Total : ${summary.price} ${CURRENCY_LABEL}

Merci de confirmer ! 🙏`;
}

export function buildWhatsappUrl(summary: BookingSummary, phoneNumber: string) {
  const normalized = phoneNumber.replace(/[^\d]/g, "");
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(
    buildWhatsappMessage(summary),
  )}`;
}
