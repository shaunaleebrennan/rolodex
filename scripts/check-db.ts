import "dotenv/config";
import { MongoClient } from "mongodb";
if (!process.env.MONGODB_URI) {
  console.log(
    "MongoDB is not configured yet. Copy .env.example to .env and set MONGODB_URI.",
  );
  process.exit(1);
}
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 8000,
});
try {
  await client.connect();
  await client.db(process.env.MONGODB_DB || "rolodex").command({ ping: 1 });
  console.log(
    "Success: MongoDB is reachable. Start Rolodex to initialize its collections.",
  );
} catch {
  console.error(
    "Could not connect. Check your Atlas connection string, database username/password and network access list.",
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
