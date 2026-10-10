import type { CapacitorConfig } from "@capacitor/cli";
const writer = process.env.PRISMA_PRODUCT === "writer";
const sheets = process.env.PRISMA_PRODUCT === "sheets";
const config: CapacitorConfig = {
  appId: sheets ? "com.oscard.prismasheets" : writer ? "com.oscard.prismawriter" : "com.oscard.prismapdf",
  appName: sheets ? "Prisma Sheets" : writer ? "Prisma Writer" : "Prisma PDF",
  webDir: sheets ? "dist-sheets" : writer ? "dist-writer" : "dist",
  android: { backgroundColor: "#f7f8fc" },
  server: { androidScheme: "https" },
};
export default config;
