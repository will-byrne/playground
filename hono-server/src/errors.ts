/**
 * Why a Pokébox lookup failed. Routes map these to the same statuses as
 * rust-server, so a missing Pokémon (404) is never confused with a broken
 * dependency.
 */
export type PokeboxErrorKind =
  /** The Pokémon doesn't exist: PokeAPI answered 404. */
  | 'not_found'
  /** PokeAPI was unreachable, failed, or sent something unexpected. */
  | 'upstream'
  /** MongoDB failed. */
  | 'db';

export class PokeboxError extends Error {
  constructor(
    readonly kind: PokeboxErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'PokeboxError';
  }
}

const STATUS: Record<PokeboxErrorKind, 404 | 500 | 502> = {
  not_found: 404,
  upstream: 502,
  db: 500,
};

/** The HTTP status for an error thrown by a lookup; unexpected errors are 500. */
export const statusFor = (error: unknown): 404 | 500 | 502 =>
  error instanceof PokeboxError ? STATUS[error.kind] : 500;

/** Runs a MongoDB call, reporting any failure as a `db` error. */
export const fromDb = async <T>(what: string, call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    throw new PokeboxError('db', `${what}: ${error}`, { cause: error });
  }
};

/**
 * Runs a PokeAPI call (pokenode-ts, which rejects with axios errors). A 404
 * is `not_found` only when `notFoundMeansMissing` is set, i.e. for the
 * Pokémon itself; anything else, including a 404 for its species, is
 * `upstream`.
 */
export const fromPokeApi = async <T>(
  what: string,
  call: () => Promise<T>,
  { notFoundMeansMissing = false } = {},
): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    const kind = notFoundMeansMissing && status === 404 ? 'not_found' : 'upstream';
    throw new PokeboxError(kind, `${what}: ${error}`, { cause: error });
  }
};
