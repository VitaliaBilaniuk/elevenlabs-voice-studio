// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { clipStats, listClips, recordClip } from './clips.mjs';
import { closeDb, getDb } from './db.mjs';
import { startMemoryMongo } from './test-mongo.mjs';

let mongod;

beforeAll(async () => {
  mongod = await startMemoryMongo();
}, 60_000);

afterEach(async () => {
  const db = await getDb();
  await db.collection('clips').deleteMany({});
});

afterAll(async () => {
  await closeDb();
  await mongod.stop();
});

describe('recordClip', () => {
  it('stores a clip and returns it with a string id', async () => {
    const clip = await recordClip({
      voiceId: 'v1',
      voiceName: 'Rachel',
      text: 'Hello there.',
      bytes: 4096,
    });

    expect(clip.id).toEqual(expect.any(String));
    expect(clip).toMatchObject({
      voiceId: 'v1',
      voiceName: 'Rachel',
      textPreview: 'Hello there.',
      characterCount: 12,
      bytes: 4096,
    });
    expect(new Date(clip.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('truncates a long text into a preview instead of storing it whole', async () => {
    const text = 'x'.repeat(200);
    const clip = await recordClip({ voiceId: 'v1', voiceName: 'Rachel', text, bytes: 1 });

    expect(clip.textPreview.length).toBe(80);
    expect(clip.textPreview.endsWith('…')).toBe(true);
    // The full character count is preserved even though the preview is cut.
    expect(clip.characterCount).toBe(200);
  });
});

describe('listClips', () => {
  it('returns clips newest first', async () => {
    await recordClip({ voiceId: 'v1', voiceName: 'Rachel', text: 'first', bytes: 1 });
    await recordClip({ voiceId: 'v1', voiceName: 'Rachel', text: 'second', bytes: 1 });

    const clips = await listClips();
    expect(clips.map((c) => c.textPreview)).toEqual(['second', 'first']);
  });

  it('filters by voiceId when given', async () => {
    await recordClip({ voiceId: 'v1', voiceName: 'Rachel', text: 'from rachel', bytes: 1 });
    await recordClip({ voiceId: 'v2', voiceName: 'Adam', text: 'from adam', bytes: 1 });

    const clips = await listClips({ voiceId: 'v2' });
    expect(clips).toHaveLength(1);
    expect(clips[0].voiceName).toBe('Adam');
  });

  it('clamps an out-of-range limit instead of trusting the caller', async () => {
    for (let i = 0; i < 5; i++) {
      await recordClip({ voiceId: 'v1', voiceName: 'Rachel', text: `clip ${i}`, bytes: 1 });
    }
    expect(await listClips({ limit: 2 })).toHaveLength(2);
    expect(await listClips({ limit: 0 })).toHaveLength(5); // 0 is falsy, falls back to the 20 default
    expect(await listClips({ limit: 10_000 })).toHaveLength(5); // clamped to 100, but only 5 exist
  });

  it('actually caps at 100 when more than that exist', async () => {
    const db = await getDb();
    const docs = Array.from({ length: 150 }, (_, i) => ({
      voiceId: 'v1',
      voiceName: 'Rachel',
      textPreview: `bulk ${i}`,
      characterCount: 6,
      bytes: 1,
      createdAt: new Date(Date.now() + i),
    }));
    await db.collection('clips').insertMany(docs);

    expect(await listClips({ limit: 10_000 })).toHaveLength(100);
  });
});

describe('clipStats', () => {
  it('reports zeros on an empty collection', async () => {
    expect(await clipStats()).toEqual({ totalClips: 0, totalCharacters: 0, topVoice: null });
  });

  it('aggregates counts and finds the most-used voice', async () => {
    await recordClip({ voiceId: 'v1', voiceName: 'Rachel', text: 'aaaaa', bytes: 1 }); // 5 chars
    await recordClip({ voiceId: 'v1', voiceName: 'Rachel', text: 'bb', bytes: 1 }); // 2 chars
    await recordClip({ voiceId: 'v2', voiceName: 'Adam', text: 'c', bytes: 1 }); // 1 char

    const stats = await clipStats();
    expect(stats.totalClips).toBe(3);
    expect(stats.totalCharacters).toBe(8);
    expect(stats.topVoice).toBe('Rachel');
  });
});
