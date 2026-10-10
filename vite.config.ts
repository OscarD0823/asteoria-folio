import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "prisma-product",
      transformIndexHtml(html) {
        if (process.env.VITE_PRODUCT === "sheets")
          return html
            .replaceAll("Prisma PDF", "Prisma Sheets")
            .replace("De documento a posibilidad", "Da forma a tus números");
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
