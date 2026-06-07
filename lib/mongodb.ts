import { Collection, MongoClient } from "mongodb";

export type BookingDocument = {
  service: string;
  serviceLabel: string;
  vehicle: string;
  vehicleLabel: string;
  firstName: string;
  phone: string;
  quartier: string;
  bookingDate: string;
  bookingDateLabel: string;
  time: string;
  priceDhs: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: Date;
};

let clientPromise: Promise<MongoClient> | null = null;
let indexesReady: Promise<void> | null = null;

function getMongoConfig() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? "atlas_lavage";

  if (!uri) {
    throw new Error("Missing MONGODB_URI");
  }

  return { uri, dbName };
}

async function getMongoClient() {
  if (!clientPromise) {
    const { uri } = getMongoConfig();
    clientPromise = new MongoClient(uri).connect();
  }

  return clientPromise;
}

export async function getBookingsCollection(): Promise<
  Collection<BookingDocument>
> {
  const { dbName } = getMongoConfig();
  const client = await getMongoClient();
  const collection = client.db(dbName).collection<BookingDocument>("bookings");

  if (!indexesReady) {
    indexesReady = collection
      .createIndex(
        { bookingDate: 1, time: 1 },
        {
          name: "active_booking_slot_unique",
          unique: true,
          partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
        },
      )
      .then(() => undefined);
  }

  await indexesReady;
  return collection;
}
