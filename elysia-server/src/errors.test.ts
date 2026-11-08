import { describe, expect, it } from 'bun:test';
import { PokeboxError, fromDb, fromPokeApi, statusFor } from './errors';

// pokenode-ts rejects with axios errors: `response.status` when PokeAPI
// answered, no `response` when it couldn't be reached.
const axiosError = (status?: number) =>
  Object.assign(new Error(status ? `Request failed with status code ${status}` : 'getaddrinfo ENOTFOUND'), {
    isAxiosError: true,
    response: status ? { status } : undefined,
  });

const kindOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return (error as PokeboxError).kind;
  }
  throw new Error('expected a rejection');
};

describe('errors', () => {
  it('maps each kind to the rust-server status', () => {
    expect(statusFor(new PokeboxError('not_found', ''))).toBe(404);
    expect(statusFor(new PokeboxError('upstream', ''))).toBe(502);
    expect(statusFor(new PokeboxError('db', ''))).toBe(500);
    expect(statusFor(new Error('boom'))).toBe(500);
  });

  it('treats a PokeAPI 404 for the pokemon as not found', async () => {
    expect(await kindOf(fromPokeApi('x', async () => { throw axiosError(404); }, { notFoundMeansMissing: true })))
      .toBe('not_found');
  });

  it('treats other PokeAPI failures as upstream', async () => {
    for (const error of [axiosError(500), axiosError(503), axiosError(), new SyntaxError('bad json')]) {
      expect(await kindOf(fromPokeApi('x', async () => { throw error; }, { notFoundMeansMissing: true })))
        .toBe('upstream');
    }
  });

  it('treats a 404 for a dependent resource (e.g. species) as upstream', async () => {
    expect(await kindOf(fromPokeApi('species', async () => { throw axiosError(404); }))).toBe('upstream');
  });

  it('reports any database failure as db', async () => {
    expect(await kindOf(fromDb('find', async () => { throw new Error('MongoServerSelectionError'); }))).toBe('db');
  });

  it('passes successful results through', async () => {
    expect(await fromDb('find', async () => 42)).toBe(42);
    expect(await fromPokeApi('x', async () => 'ok')).toBe('ok');
  });
});
