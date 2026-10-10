const writer = import.meta.env?.VITE_PRODUCT === "writer";
export const product = {
  writer,
  id: writer ? "prisma-writer" : "prisma-pdf",
  name: writer ? "Prisma Writer" : "Prisma PDF",
  version: writer ? "1.0.0" : "6.0.0",
  assetName: writer ? "Prisma-Writer" : "Prisma-PDF",
  website:
    "https://oscard0823.github.io/prisma-pdf/" + (writer ? "writer/" : ""),
  repository: "https://github.com/OscarD0823/prisma-pdf",
};
