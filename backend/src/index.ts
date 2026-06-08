import { app } from "./server.js";
import { env } from "./utils/env.js";
import { connectDB } from "./config/db.js";

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
