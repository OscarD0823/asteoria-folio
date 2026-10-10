declare module "citeproc" {
  const CSL: {
    Engine: new (
      sys: {
        retrieveLocale: (lang: string) => string;
        retrieveItem: (id: string) => Record<string, unknown>;
      },
      style: string,
      locale?: string,
      forceLocale?: boolean,
    ) => {
      setOutputFormat: (format: string) => void;
      updateItems: (ids: string[]) => void;
      makeCitationCluster: (
        items: { id: string; locator?: string; label?: string }[],
      ) => string;
      makeBibliography: () =>
        | [{ entry_ids: string[][]; hangingindent?: boolean }, string[]]
        | false;
    };
  };
  export default CSL;
}
