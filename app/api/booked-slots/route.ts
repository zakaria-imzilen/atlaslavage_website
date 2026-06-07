import { NextRequest, NextResponse } from "next/server";
import { isIsoDate, TIME_SLOTS } from "@/lib/booking";
import { getBookingsCollection } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");

  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const collection = await getBookingsCollection();
    const rows = await collection
      .find(
        { bookingDate: date, status: { $ne: "cancelled" } },
        { projection: { time: 1 } },
      )
      .toArray();

    const booked = rows
      .map((row) => row.time)
      .filter((time) => TIME_SLOTS.includes(time as (typeof TIME_SLOTS)[number]));

    return NextResponse.json({ booked });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de vérifier les créneaux" },
      { status: 500 },
    );
  }
}
