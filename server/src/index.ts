import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env"), quiet: true });

// Import after dotenv so modules that read env at load time see .env values.
const { startServer } = await import("./app");
const { port } = await startServer(Number(process.env.PORT ?? 3000));
console.log(`deadlock server on http://localhost:${port}`);
