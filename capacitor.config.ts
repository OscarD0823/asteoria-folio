import type { CapacitorConfig } from "@capacitor/cli";
import products from './products.json';
const kind=(process.env.PRISMA_PRODUCT??'pdf') as keyof typeof products;
const info=products[kind]??products.pdf;
const config: CapacitorConfig = {
  appId:'com.oscard.prisma'+kind,
  appName:info.name,
  webDir:kind==='pdf'?'dist':'dist-'+kind,
  android: { backgroundColor: "#f7f8fc" },
  server: { androidScheme: "https" },
};
export default config;
