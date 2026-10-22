import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env"), quiet: true });

// Last resort: log and keep serving rather than die on stage.
process.on("uncaughtException", (err) => console.error("uncaught:", err));
process.on("unhandledRejection", (err) => console.error("unhandled rejection:", err));

// Import after dotenv so modules that read env at load time see .env values.
const { startServer } = await import("./app");
const { port } = await startServer(Number(process.env.PORT ?? 3000));

// Same-Wi-Fi fallback for phones if the tunnel is down.
const lan = Object.values(os.networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => `http://${a!.address}:${port}`);
console.log(`deadlock server on http://localhost:${port}${lan.length ? `  (LAN: ${lan.join(", ")})` : ""}`);
if (process.env.JOIN_URL) console.log(`join url: ${process.env.JOIN_URL}`);
if (process.env.ADMIN_KEY) console.log(`admin: /admin?key=${process.env.ADMIN_KEY}`);
