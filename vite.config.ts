import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "prisma-product",
      transformIndexHtml(html) {
        return process.env.VITE_PRODUCT === "writer"
          ? html
              .replaceAll("Prisma PDF", "Prisma Writer")
              .replace(
                "De documento a posibilidad",
                "Tus palabras, tu próxima idea",
              )
          : html;
      },
    },
  ],
  base: "./",
  optimizeDeps: { entries: ["index.html"] },
  worker: { format: "es" },
  build: { chunkSizeWarningLimit: 1800 },
});
