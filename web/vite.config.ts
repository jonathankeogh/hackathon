import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const SERVER = `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // reachable from phones on the LAN
    port: 5173,
    proxy: {
      "/api": SERVER,
      "/socket.io": { target: SERVER, ws: true },
    },
  },
});
