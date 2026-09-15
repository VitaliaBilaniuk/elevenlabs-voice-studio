import { buildSchema } from 'graphql';
import { clipStats, listClips } from './clips.mjs';

// Read-only on purpose: history is written by the /api/tts REST handler (it
// already has the audio bytes in hand as it streams them), and GraphQL is
// used for the part it's actually good at here — flexible, shaped reads
// (filter by voice, aggregate stats) — rather than as a second write path.
export const schema = buildSchema(`
  type Clip {
    id: ID!
    voiceId: String!
    voiceName: String!
    textPreview: String!
    characterCount: Int!
    bytes: Int!
    createdAt: String!
  }

  type ClipStats {
    totalClips: Int!
    totalCharacters: Int!
    topVoice: String
  }

  type Query {
    clips(limit: Int = 20, voiceId: String): [Clip!]!
    clipStats: ClipStats!
  }
`);

export const rootValue = {
  clips: ({ limit, voiceId }) => listClips({ limit: limit ?? undefined, voiceId: voiceId ?? undefined }),
  clipStats: () => clipStats(),
};
