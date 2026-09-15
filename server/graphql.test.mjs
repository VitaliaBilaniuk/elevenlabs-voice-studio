// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from './app.mjs';
import { recordClip } from './clips.mjs';
import { closeDb, getDb } from './db.mjs';
import { startMemoryMongo } from './test-mongo.mjs';

let mongod;
let server;
let base;

beforeAll(async () => {
  mongod = await startMemoryMongo();
  server = createServer().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
}, 60_000);

afterEach(async () => {
  const db = await getDb();
  await db.collection('clips').deleteMany({});
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closeDb();
  await mongod.stop();
});

async function postGraphQL(query, variables) {
  const res = await fetch(`${base}/api/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return { status: res.status, body: await res.json() };
}

describe('POST /api/graphql', () => {
  it('answers clips and clipStats over real persisted data', async () => {
    await recordClip({ voiceId: 'v1', voiceName: 'Rachel', text: 'Hello there.', bytes: 42 });
    await recordClip({ voiceId: 'v2', voiceName: 'Adam', text: 'Second one.', bytes: 84 });

    const { status, body } = await postGraphQL(`
      query {
        clips { voiceName textPreview bytes }
        clipStats { totalClips totalCharacters topVoice }
      }
    `);

    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    expect(body.data.clips).toHaveLength(2);
    expect(body.data.clips[0].voiceName).toBe('Adam'); // newest first
    expect(body.data.clipStats.totalClips).toBe(2);
  });

  it('filters clips by voiceId through a GraphQL variable', async () => {
    await recordClip({ voiceId: 'v1', voiceName: 'Rachel', text: 'a', bytes: 1 });
    await recordClip({ voiceId: 'v2', voiceName: 'Adam', text: 'b', bytes: 1 });

    const { body } = await postGraphQL(
      `query ($voiceId: String) { clips(voiceId: $voiceId) { voiceName } }`,
      { voiceId: 'v1' },
    );

    expect(body.data.clips).toEqual([{ voiceName: 'Rachel' }]);
  });

  it('rejects an unknown field with a GraphQL error, not a 500', async () => {
    const { status, body } = await postGraphQL(`query { clips { notAField } }`);
    expect(status).toBeLessThan(500); // never crashes the server
    expect(body.errors?.[0]?.message).toMatch(/notAField/);
  });
});
