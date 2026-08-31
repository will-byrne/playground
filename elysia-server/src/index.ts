import { initializeDatabase } from "./data-source";
import { app } from "./server";

const start = async () => {
  await initializeDatabase();
  app.listen(3000);

  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
  );
};

start().catch((error) => {
  console.error("Failed to start the server", error);
  process.exit(1);
});

