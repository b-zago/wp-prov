import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({ applyBaseStyles: false }),
    react(),
  ],
  server: {
    host: "0.0.0.0",
    port: 4321,
  },
  vite: {
    server: {
      // Proxy API calls to FastAPI in dev so we can run `npm run dev`
      // on :4321 and still hit the Python backend on :8000.
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  },
});
