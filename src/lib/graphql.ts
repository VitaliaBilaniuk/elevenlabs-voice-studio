/**
 * A minimal GraphQL-over-HTTP client. No Apollo/urql here on purpose — this
 * app makes exactly two queries, and a hand-rolled fetch keeps the same
 * "understand every line" ethos as the rest of the proxy client (lib/api.ts).
 */

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

export class GraphQLError extends Error {}

export async function queryGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });

  if (!response.ok) {
    throw new GraphQLError(`GraphQL request failed (${response.status}).`);
  }

  const body = (await response.json()) as GraphQLResponse<T>;
  if (body.errors?.length) {
    throw new GraphQLError(body.errors.map((e) => e.message).join('; '));
  }
  if (!body.data) {
    throw new GraphQLError('GraphQL response had no data.');
  }
  return body.data;
}
