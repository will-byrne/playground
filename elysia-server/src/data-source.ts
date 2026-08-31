import "reflect-metadata";
import { DataSource } from "typeorm";
import { PokeboxEntry } from "./model";

export const AppDataSource = new DataSource({
  type: "mongodb",
  host: "localhost",
  port: 27017,
  username: "admin",
  password: "testtest",
  database: "pokemon",
  authSource: "admin",
  synchronize: true,
  entities: [PokeboxEntry],
});

export const initializeDatabase = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  return AppDataSource;
};
