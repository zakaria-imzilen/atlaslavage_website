import { NextRequest, NextResponse } from "next/server";
import {
  buildWhatsappUrl,
  formatDate,
  SERVICES,
  toSummary,
  validateBookingPayload,
  VEHICLES,
} from "@/lib/booking";
import { getBookingsCollection } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validateBookingPayload(body);

  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 422 });
  }

  const summary = toSummary(parsed.data);

  try {
    const collection = await getBookingsCollection();
    const existing = await collection.findOne({
      bookingDate: summary.date,
      time: summary.time,
      status: { $ne: "cancelled" },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ce créneau est déjà réservé" },
        { status: 409 },
      );
    }

    const inserted = await collection.insertOne({
      service: summary.service,
      serviceLabel: SERVICES[summary.service].label,
      vehicle: summary.vehicle,
      vehicleLabel: VEHICLES[summary.vehicle].label,
      firstName: summary.firstName,
      phone: summary.phone,
      quartier: summary.quartier,
      bookingDate: summary.date,
      bookingDateLabel: formatDate(summary.date),
      time: summary.time,
      priceDhs: summary.price,
      status: "pending",
      createdAt: new Date(),
    });

    const booking = { ...summary, id: inserted.insertedId.toString() };
    const whatsappUrl = buildWhatsappUrl(
      booking,
      process.env.WHATSAPP_NUMBER ?? "",
    );

    return NextResponse.json({ booking, whatsappUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de confirmer la réservation" },
      { status: 500 },
    );
  }
}
