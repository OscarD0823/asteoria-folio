import products from '../products.json';
export type ProductKind = keyof typeof products;
export type EditorKind = Exclude<ProductKind, 'prisma'>;
export const editorKinds: EditorKind[] = ['writer', 'sheets', 'slides', 'pdf', 'data', 'publisher'];
export function isEditorKind(value: unknown): value is EditorKind {
  return typeof value === 'string' && editorKinds.includes(value as EditorKind);
}
export function resolveProducts(requested: string, search = '') {
  const distribution = Object.hasOwn(products, requested) ? requested as ProductKind : 'pdf';
  const editor = new URLSearchParams(search).get('editor');
  return { distribution, active: distribution === 'prisma' && isEditorKind(editor) ? editor : distribution };
}
export function productInfo(kind: ProductKind) {
  return {
    ...products[kind], kind, writer: kind === 'writer', sheets: kind === 'sheets',
    slides: kind === 'slides', data: kind === 'data', publisher: kind === 'publisher',
    id: kind === 'prisma' ? 'prisma' : 'prisma-' + kind,
    nativeId: kind === 'prisma' ? 'com.oscard.prisma' : 'com.oscard.prisma' + kind,
    assetName: products[kind].name.replaceAll(' ', '-'),
    logo: kind === 'pdf' ? './pdf-logo.svg' : './' + kind + '-logo.svg',
    tagPrefix: kind === 'pdf' ? 'v' : kind + '-v',
    website: 'https://oscard0823.github.io/' + products[kind].siteSlug + '/',
    repository: 'https://github.com/OscarD0823/' + products[kind].siteSlug,
  };
}
