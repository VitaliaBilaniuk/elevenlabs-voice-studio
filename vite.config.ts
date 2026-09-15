/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = process.env.API_PORT ?? '8787';

// The React app talks to a small Node proxy (server/index.mjs) so the
// ElevenLabs API key never reaches the browser. In dev, Vite forwards
// every /api/* request to that proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    server: {
      // graphql-js does its own `instanceof GraphQLSchema` checks internally.
      // Left to Vitest's default per-file module graph, `graphql` (built by
      // schema.mjs) and `graphql`-as-seen-by-graphql-http end up as two
      // separate module instances across test files, and that check fails
      // with "Cannot use GraphQLSchema from another module or realm" even
      // though it's the same package on disk. Inlining forces one shared
      // instance. See server/graphql.test.mjs and app.test.mjs's
      // "degrades /api/graphql" case.
      deps: { inline: ['graphql', 'graphql-http'] },
    },
  },
});
