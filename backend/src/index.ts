import { app } from "./server";
import { env } from "./utils/env";
import { connectDB } from "./config/db";

const port = Number(env.PORT) || 4000;

async function start(): Promise<void> {
  await connectDB();

  app.listen(port, () => {
    console.log(`[server] Backend running at http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
