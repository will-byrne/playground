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
  }

  return AppDataSource;
};
