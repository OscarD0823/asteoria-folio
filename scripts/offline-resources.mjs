/** Keep the editor, spelling engine and everyday fonts available offline first. */
export function requiredResources(names) {
  return names.filter(name => !/\.(ttf|otf|woff2?)$/i.test(name) ||
    /^fonts\/(Liberation(Sans|Serif|Mono)-|Carlito\/|Caladea\/|Arimo\/|NotoSans\/|NotoSerif\/|NotoSansMath\/|NotoSansSymbols2\/)/.test(name));
}
