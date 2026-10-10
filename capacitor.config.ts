import type { CapacitorConfig } from "@capacitor/cli";
const writer = process.env.PRISMA_PRODUCT === "writer";
const config: CapacitorConfig = {
  appId: writer ? "com.oscard.prismawriter" : "com.oscard.prismapdf",
  appName: writer ? "Prisma Writer" : "Prisma PDF",
  webDir: writer ? "dist-writer" : "dist",
  android: { backgroundColor: "#f7f8fc" },
  server: { androidScheme: "https" },
};
export default config;
