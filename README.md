# Lavage Atlas

Next.js multi-step reservation form for a car wash service in Marrakech.

## Setup

1. Create a MongoDB database, for example in MongoDB Atlas.
2. Copy `.env.example` to `.env.local` and fill:

```bash
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
MONGODB_DB=atlas_lavage
WHATSAPP_NUMBER=+212612345678
```

3. Install and run:

```bash
npm install
npm run migrate:mongodb
npm run dev
```

## Behavior

- 3-step reservation flow: vehicle shape, package, then contact/schedule.
- Package prices are kept in one matrix so vehicle-specific pricing can be changed later.
- Booked slots are fetched from MongoDB by date.
- Confirmation inserts a pending booking into MongoDB.
- MongoDB credentials are used only in server API routes.
