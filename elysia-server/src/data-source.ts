import "reflect-metadata";
import { DataSource } from "typeorm";
import { PokeboxEntry } from "./model";

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
});

export const initializeDatabase = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  return AppDataSource;
};
