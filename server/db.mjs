import { MongoClient } from 'mongodb';

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/voice-studio';

let client;
let dbPromise;

/**
 * Lazily connect to Mongo and cache the connection. Reads MONGODB_URI at
 * call time (not import time) so tests can point it at an ephemeral
 * in-memory instance before the first query runs.
 */
export function getDb() {
  if (!dbPromise) {
    const uri = process.env.MONGODB_URI ?? DEFAULT_URI;
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    dbPromise = client.connect().then((c) => c.db());
    // If the initial connection fails, don't cache the rejection forever —
    // the next call should retry rather than replay the same error indefinitely.
    dbPromise.catch(() => {
      dbPromise = undefined;
    });
  }
  return dbPromise;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = undefined;
    dbPromise = undefined;
  }
}
