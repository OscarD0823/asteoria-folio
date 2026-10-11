import { productInfo, resolveProducts } from './product-core';
const selection = resolveProducts(import.meta.env?.VITE_PRODUCT ?? 'pdf', typeof window === 'undefined' ? '' : window.location.search);
// One editor per navigation, retaining its storage identity. Installation and
// updates always belong to the distribution, including inside global Prisma.
export const product = productInfo(selection.active);
export const distributionProduct = productInfo(selection.distribution);
export const inPrisma = selection.distribution === 'prisma';
