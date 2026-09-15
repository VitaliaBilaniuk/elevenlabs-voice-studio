import { MongoMemoryServer } from 'mongodb-memory-server';

// Pinned rather than "latest": mongodb-memory-server's default binary is
// built for a newer macOS baseline than every machine this runs on will
// have, and fails at launch with a missing-symbol dyld error there ("built
// for macOS 14.0 which is newer than running OS"). 7.0.14 is broadly
// compatible and has no bearing on which `mongodb` driver version the app
// itself uses.
const PINNED_VERSION = '7.0.14';

/** Start an ephemeral, real MongoDB and point MONGODB_URI at it. Callers
 * must not have called db.mjs's getDb() yet — it caches its connection on
 * first use, so the env var has to be set before that happens. */
export async function startMemoryMongo() {
  const mongod = await MongoMemoryServer.create({ binary: { version: PINNED_VERSION } });
  process.env.MONGODB_URI = mongod.getUri();
  return mongod;
}
