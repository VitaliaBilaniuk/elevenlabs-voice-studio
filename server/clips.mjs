import { getDb } from './db.mjs';

const COLLECTION = 'clips';
const PREVIEW_LEN = 80;
const MAX_LIMIT = 100;

/**
 * Persist a record of a synthesis. Called fire-and-forget from the /api/tts
 * handler — a Mongo hiccup should never slow down or fail audio delivery,
 * only the "history" feature built on top of it.
 */
export async function recordClip({ voiceId, voiceName, text, bytes }) {
  const db = await getDb();
  const doc = {
    voiceId,
    voiceName,
    textPreview: text.length > PREVIEW_LEN ? `${text.slice(0, PREVIEW_LEN - 1)}…` : text,
    characterCount: text.length,
    bytes,
    createdAt: new Date(),
  };
  const { insertedId } = await db.collection(COLLECTION).insertOne(doc);
  return toClip({ _id: insertedId, ...doc });
}

/** Most recent clips first, optionally filtered to one voice. */
export async function listClips({ limit = 20, voiceId } = {}) {
  const db = await getDb();
  const query = voiceId ? { voiceId } : {};
  const boundedLimit = Math.min(Math.max(Math.trunc(limit) || 20, 1), MAX_LIMIT);
  const docs = await db
    .collection(COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(boundedLimit)
    .toArray();
  return docs.map(toClip);
}

/** Aggregate counters for the whole history — a small reason GraphQL earns
 * its place here: shaping an aggregate is awkward as a REST resource, easy
 * as a query. */
export async function clipStats() {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const [totals] = await collection
    .aggregate([
      { $group: { _id: null, totalClips: { $sum: 1 }, totalCharacters: { $sum: '$characterCount' } } },
    ])
    .toArray();

  const [topVoiceDoc] = await collection
    .aggregate([
      { $group: { _id: '$voiceName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ])
    .toArray();

  return {
    totalClips: totals?.totalClips ?? 0,
    totalCharacters: totals?.totalCharacters ?? 0,
    topVoice: topVoiceDoc?._id ?? null,
  };
}

function toClip(doc) {
  return {
    id: doc._id.toString(),
    voiceId: doc.voiceId,
    voiceName: doc.voiceName,
    textPreview: doc.textPreview,
    characterCount: doc.characterCount,
    bytes: doc.bytes,
    createdAt: doc.createdAt.toISOString(),
  };
}
