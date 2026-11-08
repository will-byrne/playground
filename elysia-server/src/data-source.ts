import "reflect-metadata";
import * as mongodb from "mongodb";
import { DataSource } from "typeorm";
import { PokeboxEntry } from "./model";

/**
 * How long a query waits for MongoDB before failing (and the request
 * answering 500). The driver's 30s default outlasts Bun's HTTP idle timeout,
 * so the client would get a dropped connection instead of an error. Same value
 * in every server.
 */
const SERVER_SELECTION_TIMEOUT_MS = 5000;

// TypeORM only forwards a fixed list of driver options, and not this one, so
// hand it the driver with `connect` wrapped to add it.
const driver = {
  ...mongodb,
  MongoClient: Object.assign(Object.create(mongodb.MongoClient), {
    connect: (url: string, options?: mongodb.MongoClientOptions) =>
      mongodb.MongoClient.connect(url, {
        ...options,
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      }),
  }),
};

export const AppDataSource = new DataSource({
  type: "mongodb",
  host: process.env.MONGODB_HOST || "localhost",
  port: parseInt(process.env.MONGODB_PORT || "27017", 10),
  username: process.env.MONGODB_USERNAME || "admin",
  password: process.env.MONGODB_PASSWORD || "testtest",
  database: process.env.MONGODB_DATABASE || "pokemon",
  authSource: process.env.MONGODB_AUTH_SOURCE || "admin",
  synchronize: true,
  entities: [PokeboxEntry],
  driver,
});

export const initializeDatabase = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    await ensureUniqueId();
  }

  return AppDataSource;
};

/**
 * rust-server's unique index on `id` (same default name, `id_1`, so every
 * server shares one index), so concurrent first lookups of the same Pokémon
 * can't store it twice. Created here rather than with `@Index({ unique: true })`:
 * TypeORM's generated index names collide with the non-unique index existing
 * databases already have, and `synchronize` then fails at startup. Failing to
 * create it (duplicates already stored) is logged, not fatal; upserts still
 * keep new writes from duplicating.
 */
const ensureUniqueId = async () => {
  try {
    await AppDataSource.getMongoRepository(PokeboxEntry).createCollectionIndex({ id: 1 }, { unique: true });
  } catch (error) {
    console.warn(
      `WARNING: could not create the unique index on pokemon.id (${error}). If duplicates are already stored, remove them and restart.`,
    );
  }
};
