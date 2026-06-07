import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";

loadEnvFile(".env.local");
loadEnvFile(".env");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "atlas_lavage";
const collectionName = "bookings";

if (!uri) {
  throw new Error("Missing MONGODB_URI. Set it in .env.local or your shell.");
}

const bookingValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "service",
      "serviceLabel",
      "vehicle",
      "vehicleLabel",
      "firstName",
      "phone",
      "quartier",
      "bookingDate",
      "bookingDateLabel",
      "time",
      "priceDhs",
      "status",
      "createdAt",
    ],
    additionalProperties: true,
    properties: {
      service: {
        enum: ["express", "classique", "premium"],
      },
      serviceLabel: {
        bsonType: "string",
      },
      vehicle: {
        enum: ["citadine", "berline", "suv_4x4", "utilitaire"],
      },
      vehicleLabel: {
        bsonType: "string",
      },
      firstName: {
        bsonType: "string",
        minLength: 1,
      },
      phone: {
        bsonType: "string",
        minLength: 10,
      },
      quartier: {
        bsonType: "string",
        minLength: 1,
      },
      bookingDate: {
        bsonType: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      },
      bookingDateLabel: {
        bsonType: "string",
      },
      time: {
        enum: [
          "09:00",
          "10:00",
          "11:00",
          "12:00",
          "14:00",
          "15:00",
          "16:00",
          "17:00",
          "18:00",
        ],
      },
      priceDhs: {
        bsonType: "int",
        minimum: 0,
      },
      status: {
        enum: ["pending", "confirmed", "cancelled"],
      },
      createdAt: {
        bsonType: "date",
      },
    },
  },
};

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  const existingCollections = await db
    .listCollections({ name: collectionName }, { nameOnly: true })
    .toArray();

  if (existingCollections.length === 0) {
    await db.createCollection(collectionName, {
      validator: bookingValidator,
      validationLevel: "moderate",
      validationAction: "error",
    });
    console.log(`Created collection: ${dbName}.${collectionName}`);
  } else {
    await db.command({
      collMod: collectionName,
      validator: bookingValidator,
      validationLevel: "moderate",
      validationAction: "error",
    });
    console.log(`Updated validator: ${dbName}.${collectionName}`);
  }

  const bookings = db.collection(collectionName);

  await bookings.createIndex(
    { bookingDate: 1, time: 1 },
    {
      name: "active_booking_slot_unique",
      unique: true,
      partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
    },
  );

  await bookings.createIndex(
    { bookingDate: 1, status: 1 },
    { name: "booking_date_status_idx" },
  );

  await bookings.createIndex(
    { createdAt: -1 },
    { name: "created_at_desc_idx" },
  );

  await bookings.createIndex({ phone: 1 }, { name: "phone_idx" });

  console.log("MongoDB migration completed successfully.");
} finally {
  await client.close();
}

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key]) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
