import products from '../products.json';
const requested=import.meta.env?.VITE_PRODUCT??'pdf';
const kind=(requested in products?requested:'pdf') as keyof typeof products;
const writer=kind==='writer',sheets=kind==='sheets';
export const product = {
  writer,
  sheets,
  kind,slides:kind==='slides',data:kind==='data',publisher:kind==='publisher',
  id:'prisma-'+kind,
  name:products[kind].name,
  version:products[kind].version,
  assetName:products[kind].name.replace(' ','-'),
  tagPrefix:kind==='pdf'?'v':kind+'-v',
  website:
    "https://oscard0823.github.io/prisma-pdf/" +
    (kind==='pdf'?'':kind+'/'),
  repository: "https://github.com/OscarD0823/prisma-pdf",
};
