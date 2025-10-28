import { app } from "./server";
import { env } from "./utils/env";

const port = Number(env.PORT) || 4000;

app.listen(port, () => {
  console.log(`🚀 Backend running on http://localhost:${port}`);
});
