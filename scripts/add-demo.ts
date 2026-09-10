import "dotenv/config";
import { Store } from "../server/store.js";
import { addDemo } from "../server/demo.js";
const store = new Store({
  uri: process.env.MONGODB_URI,
  database: process.env.MONGODB_DB,
});
try {
  await store.open();
  console.log(
    `Added ${await addDemo(store)} fictional interview contacts. Legacy sample-name suffixes were cleaned up; other contact details were preserved. Refresh Rolodex, then run search:prepare to index these new notes.`,
  );
} catch {
  console.error(
    "Could not finish adding the demo contacts. Check your local database configuration. No credentials have been logged.",
  );
  process.exitCode = 1;
} finally {
  await store.close();
}
