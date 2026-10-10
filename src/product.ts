const writer = import.meta.env?.VITE_PRODUCT === "writer";
const sheets = import.meta.env?.VITE_PRODUCT === "sheets";
export const product = {
  writer,
  sheets,
  id: sheets ? "prisma-sheets" : writer ? "prisma-writer" : "prisma-pdf",
  name: sheets ? "Prisma Sheets" : writer ? "Prisma Writer" : "Prisma PDF",
  version: sheets ? "0.1.1" : writer ? "1.1.1" : "6.1.1",
  assetName: sheets ? "Prisma-Sheets" : writer ? "Prisma-Writer" : "Prisma-PDF",
  tagPrefix: sheets ? "sheets-v" : writer ? "writer-v" : "v",
  website:
    "https://oscard0823.github.io/prisma-pdf/" +
    (sheets ? "sheets/" : writer ? "writer/" : ""),
  repository: "https://github.com/OscarD0823/prisma-pdf",
};
