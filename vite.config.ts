import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Older Hunspell bindings call nanoid's CommonJS export. Make that import
// explicit for Rollup, including the separately compiled spelling worker.
const proofingInterop = () => ({
  name: 'prisma-proofing-interop',
  transform(code:string,id:string){
    if(/(?:hunspell-asm|emscripten-wasm-loader)/.test(id)){
      const fixed=code.replace("import * as nanoid from 'nanoid';","import nanoid from 'nanoid';").replace("import * as runtime from './lib/node/hunspell';","import runtime from './lib/node/hunspell';").replace("import * as unixify from 'unixify';","import unixify from 'unixify';");
      if(fixed!==code)return {code:fixed,map:null};
    }
  },
});
export default defineConfig({
  plugins: [
    react(),
    proofingInterop(),
    {
      name: "prisma-product",
      transformIndexHtml(html) {
        const more:Record<string,string>={slides:'Prisma Slides',data:'Prisma Data',publisher:'Prisma Publisher',prisma:'Prisma'};
        if(process.env.VITE_PRODUCT&&more[process.env.VITE_PRODUCT])return html.replaceAll('Prisma PDF',more[process.env.VITE_PRODUCT]);
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
  server: {watch: {ignored: ["**/dist/**", "**/dist-*/**", "**/release*/**", "**/qa/**", "**/android/**"]}},
  optimizeDeps: { entries: ["index.html"] },
  worker: { format: "es", plugins:()=>[proofingInterop()] },
  build: { chunkSizeWarningLimit: 1800 },
});
